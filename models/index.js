const sequelize = require("../config/db");
const {
  recalculateOrderTotal,
  validateOrderItemStock,
  reserveStockForOrderItem,
  releaseStockForOrderItem,
  syncStockOnOrderItemUpdate,
} = require("./orderHelpers");

const User = require("./User");
const Category = require("./Category");
const Product = require("./Product");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Setting = require("./Setting");


Category.hasMany(Product, {
  foreignKey: "categoryId",
});

Product.belongsTo(Category, {
  foreignKey: "categoryId",
});


User.hasMany(Order, {
  foreignKey: "userId",
});

Order.belongsTo(User, {
  foreignKey: "userId",
});

Order.addScope("pending", {
  where: { status: "pending" },
});

const PendingOrder = Order.scope("pending");

Order.hasMany(OrderItem, {
  foreignKey: "orderId",
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
});


Product.hasMany(OrderItem, {
  foreignKey: "productId",
});

OrderItem.belongsTo(Product, {
  foreignKey: "productId",
});

async function setOrderItemPriceSnapshot(item) {
  if (!item.productId) {
    return;
  }

  const product = await Product.findByPk(item.productId);

  if (!product) {
    throw new Error("Product not found for this order line.");
  }

  item.price = product.price;
}

OrderItem.addHook("beforeValidate", async (item, options) => {
  const isNew = !item.id;
  const productChanged = item.changed("productId");
  const quantityChanged = item.changed("quantity");

  if (isNew || productChanged || quantityChanged) {
    await validateOrderItemStock(item, options);
  }

  if (isNew || productChanged) {
    await setOrderItemPriceSnapshot(item);
  }
});

OrderItem.addHook("afterCreate", async (item, options) => {
  await reserveStockForOrderItem(item, options);
  await recalculateOrderTotal(item.orderId);
});

OrderItem.addHook("afterUpdate", async (item, options) => {
  if (item.changed("productId") || item.changed("quantity")) {
    await syncStockOnOrderItemUpdate(item, options);
  }
  await recalculateOrderTotal(item.orderId);
});

OrderItem.addHook("afterDestroy", async (item, options) => {
  await releaseStockForOrderItem(item, options);
  await recalculateOrderTotal(item.orderId);
});

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Order,
  PendingOrder,
  OrderItem,
  Setting,
};

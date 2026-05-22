const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Product = require("./Product");
const sequelize = require("../config/db");

function sameUserId(a, b) {
  if (a == null || b == null) {
    return false;
  }
  return Number(a) === Number(b);
}

async function recalculateOrderTotal(orderId) {
  if (!orderId) {
    return;
  }

  const items = await OrderItem.findAll({
    where: { orderId },
  });

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.price),
    0
  );

  await Order.update(
    { totalAmount: total },
    { where: { id: orderId } }
  );
}

async function getOrderForUser(orderId, userId) {
  const order = await Order.findByPk(orderId);
  if (!order || !sameUserId(order.userId, userId)) {
    return null;
  }
  return order;
}

async function validatePendingOrderForItems(orderId, userId, isAdmin) {
  const order = await Order.findByPk(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (!isAdmin && !sameUserId(order.userId, userId)) {
    throw new Error(
      `Order #${orderId} belongs to another customer. ` +
        "Use your own pending order (My Orders → Orders → Add products)."
    );
  }

  const status = order.status || "pending";

  if (status !== "pending") {
    throw new Error(
      `Order #${orderId} is "${status}" and cannot be changed. ` +
        "Only pending (draft) orders accept new line items."
    );
  }

  return order;
}

async function assertOrderIsDraft(orderId) {
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new Error("Order not found.");
  }
  if (order.status !== "pending") {
    throw new Error(
      `Order #${orderId} is "${order.status}" and line items cannot be changed.`
    );
  }
  return order;
}

async function validateOrderItemStock(item, options = {}) {
  if (!item.productId || item.quantity == null) {
    return;
  }

  await assertOrderIsDraft(item.orderId);

  const product = await Product.findByPk(item.productId, {
    transaction: options.transaction,
  });

  if (!product) {
    throw new Error("Product not found for this order line.");
  }

  const quantity = Number(item.quantity);
  const isNew = !item.id;

  if (isNew) {
    if (quantity > Number(product.stock)) {
      throw new Error(
        `Not enough stock for "${product.name}". Only ${product.stock} available.`
      );
    }
    return;
  }

  if (item.changed("productId")) {
    if (quantity > Number(product.stock)) {
      throw new Error(
        `Not enough stock for "${product.name}". Only ${product.stock} available.`
      );
    }
    return;
  }

  if (item.changed("quantity")) {
    const previousQty = Number(item.previous("quantity"));
    const delta = quantity - previousQty;

    if (delta > 0 && delta > Number(product.stock)) {
      throw new Error(
        `Not enough stock for "${product.name}". Only ${product.stock} more available.`
      );
    }
  }
}

async function reserveStockForOrderItem(item, options = {}) {
  const product = await Product.findByPk(item.productId, {
    transaction: options.transaction,
  });

  if (!product) {
    throw new Error("Product not found for this order line.");
  }

  await product.decrement("stock", {
    by: item.quantity,
    transaction: options.transaction,
  });
}

async function releaseStockForOrderItem(item, options = {}) {
  if (!item.productId || !item.quantity) {
    return;
  }

  const product = await Product.findByPk(item.productId, {
    transaction: options.transaction,
  });

  if (product) {
    await product.increment("stock", {
      by: item.quantity,
      transaction: options.transaction,
    });
  }
}

async function syncStockOnOrderItemUpdate(item, options = {}) {
  const transaction = options.transaction;

  if (item.changed("productId")) {
    const oldProductId = item.previous("productId");
    const oldQty = item.previous("quantity");

    if (oldProductId) {
      const oldProduct = await Product.findByPk(oldProductId, {
        transaction,
      });
      if (oldProduct) {
        await oldProduct.increment("stock", { by: oldQty, transaction });
      }
    }

    const newProduct = await Product.findByPk(item.productId, {
      transaction,
    });
    if (!newProduct) {
      throw new Error("Product not found for this order line.");
    }

    await newProduct.decrement("stock", {
      by: item.quantity,
      transaction,
    });
    return;
  }

  if (item.changed("quantity")) {
    const previousQty = Number(item.previous("quantity"));
    const delta = Number(item.quantity) - previousQty;

    if (delta === 0) {
      return;
    }

    const product = await Product.findByPk(item.productId, { transaction });

    if (!product) {
      throw new Error("Product not found for this order line.");
    }

    if (delta > 0) {
      await product.decrement("stock", { by: delta, transaction });
    } else {
      await product.increment("stock", { by: -delta, transaction });
    }
  }
}

async function restoreStockForOrder(orderId, transaction) {
  const items = await OrderItem.findAll({
    where: { orderId },
    transaction,
  });

  for (const item of items) {
    await releaseStockForOrderItem(item, { transaction });
  }
}

async function placeOrder(orderId, userId, isAdmin) {
  const order = await Order.findByPk(orderId);

  if (!order) {
    throw new Error("Order not found.");
  }

  if (!isAdmin && !sameUserId(order.userId, userId)) {
    throw new Error("You can only place your own orders.");
  }

  if (order.status !== "pending") {
    throw new Error(
      `Order #${orderId} is already "${order.status}" and cannot be placed again.`
    );
  }

  const itemCount = await OrderItem.count({ where: { orderId } });

  if (itemCount === 0) {
    throw new Error("Add at least one product before placing the order.");
  }

  await recalculateOrderTotal(orderId);
  await order.update({ status: "confirmed" });

  return order.reload();
}

async function cancelOrder(order, transaction) {
  if (order.status !== "cancelled") {
    await restoreStockForOrder(order.id, transaction);
  }
  await order.update({ status: "cancelled" }, { transaction });
}

module.exports = {
  recalculateOrderTotal,
  getOrderForUser,
  validatePendingOrderForItems,
  validateOrderItemStock,
  reserveStockForOrderItem,
  releaseStockForOrderItem,
  syncStockOnOrderItemUpdate,
  placeOrder,
  cancelOrder,
  restoreStockForOrder,
};

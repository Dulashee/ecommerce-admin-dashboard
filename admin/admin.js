require("dotenv").config();

const { Op } = require("sequelize");
const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");
const AdminJSSequelize = require("@adminjs/sequelize");
const bcrypt = require("bcryptjs");
const componentLoader = require("./componentLoader");

const orderShowComponent = componentLoader.add(
  "OrderShow",
  "./components/OrderShow"
);

const dashboardComponent = componentLoader.add(
  "Dashboard",
  "./components/Dashboard"
);

async function buildOrderLinesJson(orderId) {
  const items = await OrderItem.findAll({
    where: { orderId },
    order: [["id", "ASC"]],
  });

  const lines = [];

  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    lines.push({
      id: item.id,
      productName: product?.name || `Product #${item.productId}`,
      quantity: item.quantity,
      price: Number(item.price),
      lineTotal: Number(item.quantity) * Number(item.price),
    });
  }

  return JSON.stringify(lines);
}

const {
  User,
  Product,
  Category,
  Order,
  PendingOrder,
  OrderItem,
  Setting,
} = require("../models");

const {
  getOrderForUser,
  validatePendingOrderForItems,
  placeOrder,
  cancelOrder,
} = require("../models/orderHelpers");

AdminJS.registerAdapter(AdminJSSequelize);

const isAdmin = ({ currentAdmin }) => currentAdmin?.role === "admin";

const adminOnlyNav = (name) => ({
  navigation: ({ currentAdmin }) =>
    currentAdmin?.role === "admin" ? { name } : false,
});

const catalogNav = {
  navigation: { name: "Catalog" },
};

const salesNav = {
  navigation: { name: "Sales" },
};

const myOrdersNav = {
  navigation: { name: "My Orders" },
};

const readOnlyMoney = {
  isVisible: {
    list: true,
    show: true,
    edit: false,
    new: false,
    filter: false,
  },
  description: "Auto-calculated from products in this order",
};

const canModifyPendingOrder = ({ record, currentAdmin }) => {
  if (!record || record.params.status !== "pending") {
    return false;
  }
  if (currentAdmin?.role === "admin") {
    return true;
  }
  return (
    Number(record.params.userId) === Number(currentAdmin.id)
  );
};

const canPlaceOrder = ({ record, currentAdmin }) => {
  if (!record || record.params.status !== "pending") {
    return false;
  }
  if (currentAdmin?.role === "admin") {
    return false;
  }
  return (
    Number(record.params.userId) === Number(currentAdmin.id)
  );
};

const passwordProperty = {
  type: "password",
  isVisible: {
    list: false,
    filter: false,
    show: false,
    edit: true,
  },
};

const hashPasswordHook = async (request) => {
  if (request.payload?.password) {
    request.payload.password = await bcrypt.hash(
      request.payload.password,
      10
    );
  }
  return request;
};

const adminOnlyActions = {
  new: { isAccessible: isAdmin, before: hashPasswordHook },
  edit: { isAccessible: isAdmin, before: hashPasswordHook },
  delete: { isAccessible: isAdmin },
  list: { isAccessible: isAdmin },
  show: { isAccessible: isAdmin },
};

const viewOnlyActions = {
  new: { isAccessible: isAdmin },
  edit: { isAccessible: isAdmin },
  delete: { isAccessible: isAdmin },
  bulkDelete: { isAccessible: isAdmin },
  list: { isAccessible: () => true },
  show: { isAccessible: () => true },
};

const userOwnsOrderItemRecord = async (record, userId) => {
  if (!record?.params?.orderId) {
    return false;
  }
  const order = await getOrderForUser(record.params.orderId, userId);
  return !!order;
};

const userCanModifyOrderItem = async (record, userId) => {
  const order = await getOrderForUser(record.params.orderId, userId);
  return order?.status === "pending";
};

const admin = new AdminJS({
  componentLoader,
  rootPath: "/admin",
  branding: {
    companyName: "Xcelen eCommerce Admin",
    softwareBrothers: false,
  },

  dashboard: {
    component: dashboardComponent,

    handler: async (request, response, context) => {
      const { currentAdmin } = context;
      const adminUser = isAdmin({ currentAdmin });

      const productsCount = await Product.count();

      if (adminUser) {
        const [usersCount, ordersCount, totalRevenue] = await Promise.all([
          User.count(),
          Order.count(),
          Order.sum("totalAmount", {
            where: {
              status: { [Op.in]: ["confirmed", "completed"] },
            },
          }),
        ]);

        return {
          role: "admin",
          adminName:
            currentAdmin.name ||
            currentAdmin.email?.split("@")[0] ||
            "Admin",
          usersCount,
          ordersCount,
          totalRevenue: Number(totalRevenue || 0),
          updatedAt: new Date().toISOString(),
        };
      }

      const ordersCount = await Order.count({
        where: { userId: currentAdmin.id },
      });

      const totalSpent =
        (await Order.sum("totalAmount", {
          where: { userId: currentAdmin.id },
        })) || 0;

      return {
        role: "user",
        productsCount,
        ordersCount,
        totalSpent: Number(totalSpent || 0),
        userName: currentAdmin.name || currentAdmin.email,
        updatedAt: new Date().toISOString(),
      };
    },
  },

  resources: [
    {
      resource: PendingOrder,
      options: {
        id: "PendingOrders",
        navigation: false,
        actions: {
          list: {
            before: async (request, context) => {
              if (!isAdmin(context)) {
                request.query = request.query || {};
                request.query["filters.userId"] =
                  context.currentAdmin.id;
              }
              return request;
            },
          },
          search: {
            before: async (request, context) => {
              if (!isAdmin(context)) {
                request.query = request.query || {};
                request.query["filters.userId"] =
                  context.currentAdmin.id;
              }
              return request;
            },
          },
          new: { isAccessible: false },
          edit: { isAccessible: false },
          delete: { isAccessible: false },
          show: { isAccessible: false },
        },
      },
    },

    {
      resource: User,
      options: {
        ...adminOnlyNav("Admin Management"),
        properties: {
          password: passwordProperty,
        },
        listProperties: ["id", "email", "name", "role", "createdAt"],
        showProperties: [
          "id",
          "email",
          "name",
          "role",
          "createdAt",
          "updatedAt",
        ],
        editProperties: ["email", "name", "password", "role"],
        actions: adminOnlyActions,
      },
    },

    {
      resource: Product,
      options: {
        ...catalogNav,
        listProperties: ["id", "name", "price", "stock", "categoryId"],
        showProperties: [
          "id",
          "name",
          "description",
          "price",
          "stock",
          "categoryId",
          "createdAt",
        ],
        editProperties: [
          "name",
          "description",
          "price",
          "stock",
          "categoryId",
        ],
        actions: viewOnlyActions,
      },
    },

    {
      resource: Category,
      options: {
        ...catalogNav,
        listProperties: ["id", "name", "createdAt"],
        showProperties: ["id", "name", "createdAt", "updatedAt"],
        actions: viewOnlyActions,
      },
    },

    {
      resource: Order,
      options: {
        navigation: ({ currentAdmin }) =>
          currentAdmin?.role === "admin"
            ? salesNav.navigation
            : myOrdersNav.navigation,

        properties: {
          totalAmount: {
            ...readOnlyMoney,
            label: "Order total",
          },
          status: {
            label: "Order status",
            availableValues: [
              { value: "pending", label: "Draft (building)" },
              { value: "confirmed", label: "Placed (awaiting admin)" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ],
            description:
              "Set by the system. Customers place orders; admins complete or cancel.",
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: true,
            },
          },
          notes: {
            type: "textarea",
            label: "Delivery instructions (optional)",
            description:
              "Step 1: save this order, then add products on the next screen. The total is calculated from all products you add.",
          },
          orderLines: {
            type: "string",
            isVisible: false,
          },
          userId: {
            label: "Customer",
            isVisible: {
              list: false,
              show: false,
              edit: true,
              filter: true,
            },
          },
        },

        listProperties: ["id", "status", "totalAmount", "createdAt"],
        showProperties: [
          "id",
          "status",
          "totalAmount",
          "notes",
          "createdAt",
          "updatedAt",
        ],
        filterProperties: ["status"],
        editProperties: ["notes"],

        actions: {
          new: {
            isAccessible: () => true,
            label: "Start new order",
            layout: (currentAdmin) =>
              currentAdmin?.role === "admin"
                ? ["userId", "notes"]
                : ["notes"],
            before: async (request, context) => {
              request.payload = request.payload || {};
              request.payload.totalAmount = 0;
              request.payload.status = "pending";

              if (!isAdmin(context)) {
                request.payload.userId = context.currentAdmin.id;
              }

              if (request.method === "post") {
                request.payload.status = "pending";
                if (!isAdmin(context)) {
                  request.payload.userId = context.currentAdmin.id;
                }
              }

              return request;
            },
            after: async (response) => {
              const orderId = response?.record?.params?.id;

              if (orderId) {
                response.redirectUrl = `/admin/resources/Orders/records/${orderId}/show`;
                response.notice = {
                  message:
                    "Order started. Add products below — the total includes every line you add.",
                  type: "success",
                };
              }

              return response;
            },
          },
          edit: {
            isAccessible: isAdmin,
            layout: ["userId", "status", "notes"],
            before: async (request, context) => {
              if (request.method !== "post") {
                return request;
              }

              const orderId = request.params.recordId;
              const newStatus = request.payload?.status;
              const order = await Order.findByPk(orderId);

              if (!order) {
                throw new Error("Order not found.");
              }

              if (newStatus === "completed") {
                const itemCount = await OrderItem.count({
                  where: { orderId },
                });

                if (itemCount === 0) {
                  throw new Error(
                    "Cannot complete an order with no products."
                  );
                }

                if (
                  order.status !== "pending" &&
                  order.status !== "confirmed"
                ) {
                  throw new Error(
                    "Only draft or placed orders can be completed."
                  );
                }
              }

              if (newStatus === "cancelled" && order.status !== "cancelled") {
                const { sequelize } = require("../models");
                await sequelize.transaction(async (transaction) => {
                  await cancelOrder(order, transaction);
                });
                request.payload.status = "cancelled";
              }

              return request;
            },
          },
          delete: { isAccessible: isAdmin },
          bulkDelete: { isAccessible: isAdmin },
          list: {
            isAccessible: () => true,
            before: async (request, context) => {
              if (!isAdmin(context)) {
                request.query = request.query || {};
                request.query["filters.userId"] = context.currentAdmin.id;
              }
              return request;
            },
          },
          filter: {
            before: async (request, context) => {
              if (!isAdmin(context)) {
                request.query = request.query || {};
                request.query["filters.userId"] = context.currentAdmin.id;
              }
              return request;
            },
          },
          search: {
            before: async (request, context) => {
              request.query = request.query || {};
              if (!isAdmin(context)) {
                request.query["filters.userId"] = context.currentAdmin.id;
                request.query["filters.status"] = "pending";
              }
              return request;
            },
          },
          show: {
            component: orderShowComponent,
            isAccessible: async ({ currentAdmin, record }) => {
              if (currentAdmin?.role === "admin") return true;
              return (
                Number(record?.params?.userId) ===
                Number(currentAdmin.id)
              );
            },
            handler: async (request, response, context) => {
              const { record, currentAdmin } = context;
              const json = record.toJSON(currentAdmin);
              json.params.orderLines = await buildOrderLinesJson(
                record.param("id")
              );
              return { record: json };
            },
          },
          placeOrder: {
            actionType: "record",
            icon: "Cart",
            label: "Confirm & place order",
            guard:
              "Place this order with all products listed below? Stock was already reserved when you added each product.",
            isAccessible: canPlaceOrder,
            handler: async (request, response, context) => {
              const orderId = context.record.param("id");

              try {
                await placeOrder(
                  orderId,
                  context.currentAdmin.id,
                  false
                );
              } catch (err) {
                return {
                  notice: {
                    message: err.message,
                    type: "error",
                  },
                  record: context.record.toJSON(context.currentAdmin),
                };
              }

              const record = await context.resource.findOne(orderId, context);

              return {
                notice: {
                  message:
                    "Order placed successfully. Waiting for admin approval.",
                  type: "success",
                },
                record: record.toJSON(context.currentAdmin),
                redirectUrl: context.h.recordActionUrl({
                  resourceId: context.resource.id(),
                  recordId: orderId,
                  actionName: "show",
                }),
              };
            },
          },
          addProducts: {
            actionType: "record",
            icon: "Add",
            label: "Add product",
            isAccessible: canModifyPendingOrder,
            handler: async (request, response, context) => {
              const orderId = context.record.param("id");

              return {
                redirectUrl: `/admin/resources/OrderItems/actions/new?orderId=${orderId}`,
              };
            },
          },
        },
      },
    },

    {
      resource: OrderItem,
      options: {
        navigation: ({ currentAdmin }) =>
          currentAdmin?.role === "admin" ? salesNav.navigation : false,

        properties: {
          price: {
            ...readOnlyMoney,
            label: "Unit price (snapshot)",
            description:
              "Copied from the product when added. Old orders keep this price.",
          },
          quantity: {
            label: "Quantity",
            description:
              "Cannot exceed current stock. Stock is reserved as soon as you save this line.",
          },
          productId: {
            label: "Product",
            description: "Select a product from the catalog",
            isVisible: {
              list: true,
              show: true,
              filter: true,
              new: true,
              edit: ({ currentAdmin }) => currentAdmin?.role === "admin",
            },
          },
          orderId: {
            label: "Order",
            reference: "Orders",
            description:
              "Draft orders only when adding items. Use Add products on an order to pre-fill.",
            isVisible: {
              list: true,
              show: true,
              filter: ({ currentAdmin }) => currentAdmin?.role === "admin",
              edit: ({ currentAdmin }) => currentAdmin?.role === "admin",
              new: true,
            },
          },
        },
        listProperties: [
          "id",
          "orderId",
          "productId",
          "quantity",
          "price",
        ],
        showProperties: [
          "id",
          "orderId",
          "productId",
          "quantity",
          "price",
        ],
        newProperties: ["orderId", "productId", "quantity"],
        editProperties: ["orderId", "productId", "quantity"],

        actions: {
          new: {
            isAccessible: () => true,
            before: async (request, context) => {
              request.payload = request.payload || {};
              const adminUser = isAdmin(context);
              const orderIdFromUrl = request.query?.orderId;

              if (orderIdFromUrl) {
                request.payload.orderId = orderIdFromUrl;
              }

              if (!adminUser && !request.payload.orderId) {
                const pending = await Order.findOne({
                  where: {
                    userId: context.currentAdmin.id,
                    status: "pending",
                  },
                  order: [["id", "DESC"]],
                });

                if (pending) {
                  request.payload.orderId = String(pending.id);
                }
              }

              if (request.method !== "post") {
                return request;
              }

              if (!request.payload.orderId) {
                throw new Error(
                  "Create a draft order first: My Orders → Orders → Create, then add products here."
                );
              }

              await validatePendingOrderForItems(
                request.payload.orderId,
                context.currentAdmin?.id,
                adminUser
              );

              return request;
            },
            after: async (response, request) => {
              const orderId =
                response?.record?.params?.orderId ||
                request?.payload?.orderId ||
                request?.query?.orderId;

              if (orderId && response?.record?.params?.id) {
                response.redirectUrl = `/admin/resources/Orders/records/${orderId}/show`;
                response.notice = {
                  message:
                    "Product added. See updated total on your order.",
                  type: "success",
                };
              }

              return response;
            },
          },
          edit: {
            isAccessible: async ({ currentAdmin, record }) => {
              if (currentAdmin?.role === "admin") return true;
              return userCanModifyOrderItem(
                record,
                currentAdmin.id
              );
            },
          },
          delete: {
            isAccessible: async ({ currentAdmin, record }) => {
              if (currentAdmin?.role === "admin") return true;
              return userCanModifyOrderItem(
                record,
                currentAdmin.id
              );
            },
          },
          bulkDelete: { isAccessible: isAdmin },
          list: {
            isAccessible: () => true,
            after: async (response, request, context) => {
              if (isAdmin(context) || !response?.records) {
                return response;
              }

              const orders = await Order.findAll({
                where: { userId: context.currentAdmin.id },
                attributes: ["id"],
              });

              const myOrderIds = new Set(
                orders.map((o) => String(o.id))
              );

              response.records = response.records.filter((record) =>
                myOrderIds.has(String(record.params.orderId))
              );

              return response;
            },
          },
          show: {
            isAccessible: async ({ currentAdmin, record }) => {
              if (currentAdmin?.role === "admin") return true;
              return userOwnsOrderItemRecord(
                record,
                currentAdmin.id
              );
            },
          },
        },
      },
    },

    {
      resource: Setting,
      options: {
        ...adminOnlyNav("System"),
        listProperties: ["id", "key", "value", "updatedAt"],
        showProperties: ["id", "key", "value", "createdAt", "updatedAt"],
        editProperties: ["key", "value"],
        properties: {
          key: {
            description: "Setting identifier (e.g. store_name, currency)",
          },
          value: {
            description: "Setting value shown on the storefront",
          },
        },
        actions: {
          new: { isAccessible: isAdmin },
          edit: { isAccessible: isAdmin },
          delete: { isAccessible: isAdmin },
          list: { isAccessible: isAdmin },
          show: { isAccessible: isAdmin },
        },
      },
    },
  ],
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate: async (email, password) => {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return null;
      }

      const matched = await bcrypt.compare(password, user.password);

      if (!matched) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },

    cookiePassword:
      process.env.COOKIE_PASSWORD || process.env.JWT_SECRET,
  },
  null,
  {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  }
);

module.exports = {
  admin,
  adminRouter,
};

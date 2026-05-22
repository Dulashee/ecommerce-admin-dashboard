require("dotenv").config();

const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");
const AdminJSSequelize = require("@adminjs/sequelize");
const bcrypt = require("bcryptjs");
const componentLoader = require("./componentLoader");

const {
  User,
  Product,
  Category,
  Order,
  OrderItem,
  Setting,
} = require("../models");

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

const admin = new AdminJS({
  componentLoader,
  rootPath: "/admin",
  branding: {
    companyName: "Xcelen eCommerce Admin",
    softwareBrothers: false,
  },

  dashboard: {
    component: componentLoader.add("Dashboard", "./components/Dashboard"),

    handler: async (request, response, context) => {
      const { currentAdmin } = context;
      const adminUser = isAdmin({ currentAdmin });

      const productsCount = await Product.count();

      if (adminUser) {
        const usersCount = await User.count();
        const ordersCount = await Order.count();
        const totalRevenue =
          (await Order.sum("totalAmount")) || 0;

        return {
          role: "admin",
          usersCount,
          productsCount,
          ordersCount,
          totalRevenue: Number(totalRevenue),
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
        totalSpent: Number(totalSpent),
        userName: currentAdmin.name || currentAdmin.email,
      };
    },
  },

  resources: [
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
          userId: {
            isVisible: {
              list: true,
              filter: true,
              show: true,
              edit: true,
              new: ({ currentAdmin }) => currentAdmin?.role === "admin",
            },
          },
        },

        listProperties: ["id", "totalAmount", "userId", "createdAt"],
        showProperties: [
          "id",
          "totalAmount",
          "userId",
          "createdAt",
          "updatedAt",
        ],
        newProperties: ["totalAmount", "userId"],
        editProperties: ["totalAmount", "userId"],

        actions: {
          new: {
            isAccessible: () => true,
            before: async (request, context) => {
              if (!isAdmin(context)) {
                request.payload = request.payload || {};
                request.payload.userId = context.currentAdmin.id;
              }
              return request;
            },
          },
          edit: { isAccessible: isAdmin },
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
          show: {
            isAccessible: ({ currentAdmin, record }) => {
              if (currentAdmin?.role === "admin") return true;
              return record?.params?.userId === currentAdmin.id;
            },
          },
        },
      },
    },

    {
      resource: OrderItem,
      options: {
        ...adminOnlyNav("Sales"),
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
        actions: {
          new: { isAccessible: isAdmin },
          edit: { isAccessible: isAdmin },
          delete: { isAccessible: isAdmin },
          list: { isAccessible: isAdmin },
          show: { isAccessible: isAdmin },
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

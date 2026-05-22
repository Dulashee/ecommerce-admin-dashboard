const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");
const AdminJSSequelize = require("@adminjs/sequelize");
const componentLoader = require("./componentLoader");
const session = require("express-session");

const {
  User,
  Product,
  Category,
  Order,
  OrderItem,
  Setting,
} = require("../models");


// Register Sequelize adapter
AdminJS.registerAdapter(AdminJSSequelize);


// Create AdminJS instance
const admin = new AdminJS({
  componentLoader,
  rootPath: "/admin",
  branding: {
      companyName: "Xcelen eCommerce Admin",
      softwareBrothers: false,
    },

  dashboard: {
    component: componentLoader.add(
      "Dashboard",
      "./components/Dashboard"
    ),

  handler: async () => {

    const usersCount = await User.count();

    const productsCount =
      await Product.count();

    const ordersCount =
      await Order.count();

    const orders = await Order.findAll();

    const totalRevenue = orders.reduce(
      (sum, order) =>
        sum + Number(order.totalAmount || 0),
      0
    );

    return {
      usersCount,
      productsCount,
      ordersCount,
      totalRevenue,
    };
  },
},

  resources: [

    
   {
      resource: User,

      options: {

        navigation: {
          name: "Admin Management",
        },

        properties: {

          password: {
            type: "password",

            isVisible: {
              list: false,
              filter: false,
              show: false,
              edit: true,
            },
          },
        },

        listProperties: [
          "id",
          "email",
          "name",
          "role",
          "createdAt",
        ],

        showProperties: [
          "id",
          "email",
          "name",
          "role",
          "createdAt",
          "updatedAt",
        ],

        editProperties: [
          "email",
          "name",
          "password",
          "role",
        ],

        actions: {

          new: {

            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",

            before: async (request) => {

              if (request.payload?.password) {

                const bcrypt = require("bcryptjs");

                request.payload.password =
                  await bcrypt.hash(
                    request.payload.password,
                    10
                  );
              }

              return request;
            },
          },

          edit: {

            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",

            before: async (request) => {

              if (request.payload?.password) {

                const bcrypt = require("bcryptjs");

                request.payload.password =
                  await bcrypt.hash(
                    request.payload.password,
                    10
                  );
              }

              return request;
            },
          },

          delete: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },

          list: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },

          show: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },
        },
      },
    },

    
    {
      resource: Product,

      options: {
        navigation: {
          name: "Catalog",
        },
        listProperties: [
          "id",
          "name",
          "price",
          "stock",
          "categoryId",
        ],

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
      },
    },
    {
      resource: Category,

      options: {
        navigation: {
          name: "Catalog",
        },
      },
    },
    {
      resource: Order,

      options: {
        navigation: {
          name: "Sales",
        },
        listProperties: [
          "id",
          "totalAmount",
          "userId",
          "createdAt",
        ],

        showProperties: [
          "id",
          "totalAmount",
          "userId",
          "createdAt",
          "updatedAt",
        ],
      },
    },
    {
      resource: OrderItem,

      options: {
        navigation: {
          name: "Sales",
        },
         listProperties: [
          "id",
          "productId",
          "orderId",
          "quantity",
          "price",
        ],
      },
    },
    {
      resource: Setting,

      options: {

        navigation: {
          name: "System",
        },

        actions: {

          list: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },

          new: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },

          edit: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },

          delete: {
            isAccessible: ({ currentAdmin }) =>
              currentAdmin.role === "admin",
          },

        },
      },
    },

  ],
});


// ADMIN LOGIN
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate: async (email, password) => {

      const adminUser = await User.findOne({
        where: { email },
      });

      if (!adminUser) {
        return null;
      }

      
      // // Only admins can login
      // if (adminUser.role !== "admin") {
      //   return null;
      // }

      const bcrypt = require("bcryptjs");

      const matched = await bcrypt.compare(
        password,
        adminUser.password
      );

      if (matched) {
        return adminUser;
      }

      return null;
    },

    cookiePassword: "supersecretcookie",
  },

  null,

  {
    secret: "supersecret",
    resave: false,
    saveUninitialized: true,
  }
);

module.exports = {
  admin,
  adminRouter,
};
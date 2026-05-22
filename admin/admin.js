const AdminJS = require("adminjs");
const AdminJSExpress = require("@adminjs/express");
const AdminJSSequelize = require("@adminjs/sequelize");
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
  rootPath: "/admin",

  resources: [

    
    {
      resource: User,

      options: {
        properties: {
          password: {
            isVisible: false,
          },
        },
      },
    },

    
    { resource: Product },
    { resource: Category },
    { resource: Order },
    { resource: OrderItem },
    { resource: Setting },

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

      
      // Only admins can login
      if (adminUser.role !== "admin") {
        return null;
      }

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
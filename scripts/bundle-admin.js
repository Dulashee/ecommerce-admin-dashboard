process.env.NODE_ENV = process.env.NODE_ENV || "production";

require("dotenv").config();

const { admin } = require("../admin/admin");

admin
  .initialize()
  .then(() => {
    console.log("AdminJS user components bundled (.adminjs/bundle.js)");
    process.exit(0);
  })
  .catch((err) => {
    console.error("AdminJS bundle failed:");
    console.error(err);
    process.exit(1);
  });

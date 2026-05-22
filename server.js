require("dotenv").config();

const express = require("express");
const { sequelize } = require("./models");
const authRoutes = require("./routes/authRoutes");
const { admin, adminRouter } = require("./admin/admin");

const app = express();

app.use(express.json());
app.use("/api", authRoutes);
app.use(admin.options.rootPath, adminRouter);

app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

app.get("/", (req, res) => {
  res.redirect(admin.options.rootPath);
});

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

async function start() {
  console.log("Bundling AdminJS components (required for custom dashboard)...");
  await admin.initialize();
  console.log("AdminJS ready");

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin panel: /admin`);
  });

  sequelize
    .sync(isProduction ? {} : { alter: true })
    .then(() => {
      console.log("Database connected and synced");
    })
    .catch((err) => {
      console.error("Database sync error:");
      console.error(err);
    });
}

start().catch((err) => {
  console.error("Failed to start server:");
  console.error(err);
  process.exit(1);
});

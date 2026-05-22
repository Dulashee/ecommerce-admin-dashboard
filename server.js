require("dotenv").config();

const fs = require("fs");
const path = require("path");

// Skip runtime bundling when a pre-built bundle exists (avoids OOM on Railway).
const bundlePath = path.join(__dirname, ".adminjs", "bundle.js");
if (fs.existsSync(bundlePath)) {
  process.env.ADMIN_JS_SKIP_BUNDLE = "true";
}

const express = require("express");
const { sequelize } = require("./models");
const authRoutes = require("./routes/authRoutes");
const { admin, adminRouter } = require("./admin/admin");

const app = express();

// Required on Railway so secure session cookies work behind HTTPS proxy
app.set("trust proxy", 1);

// JSON parser only for API — must NOT run before AdminJS (login uses formidable)
app.use("/api", express.json(), authRoutes);
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
  if (!fs.existsSync(bundlePath)) {
    console.log("No pre-built bundle found — bundling AdminJS components...");
    await admin.initialize();
  } else {
    console.log("Using pre-built AdminJS bundle (.adminjs/bundle.js)");
  }

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

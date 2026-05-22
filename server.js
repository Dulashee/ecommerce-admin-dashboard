const express = require("express");
const { sequelize } = require("./models");
const authRoutes = require("./routes/authRoutes");
const { admin, adminRouter } = require("./admin/admin");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use("/api", authRoutes);
app.use(admin.options.rootPath, adminRouter);

app.get("/", (req, res) => {
  res.send("Server Running...");
});

const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database connected successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Database connection error:");
    console.log(err);
  });
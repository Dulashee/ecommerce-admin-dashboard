const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OrderItem = sequelize.define("OrderItem", {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

module.exports = OrderItem;

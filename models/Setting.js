const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Setting = sequelize.define("Setting", {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Setting;
const { Sequelize } = require("sequelize");

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;

  if (!DB_HOST || !DB_NAME) {
    return null;
  }

  const user = encodeURIComponent(DB_USER || "postgres");
  const password = encodeURIComponent(DB_PASSWORD || "");
  const port = DB_PORT || 5432;

  return `postgres://${user}:${password}@${DB_HOST}:${port}/${DB_NAME}`;
}

function shouldUseSsl(url) {
  if (process.env.DB_SSL === "true") {
    return true;
  }
  if (process.env.DB_SSL === "false") {
    return false;
  }
  if (!url) {
    return false;
  }
  // Railway private network and local dev do not use SSL
  if (
    url.includes("railway.internal") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1")
  ) {
    return false;
  }
  // Public Railway / cloud URLs need SSL
  return true;
}

const databaseUrl = getDatabaseUrl();

if (!databaseUrl) {
  throw new Error(
    "Missing database config. Set DATABASE_URL (Railway) or DB_HOST, DB_NAME, DB_USER, DB_PASSWORD."
  );
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectOptions: shouldUseSsl(databaseUrl)
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

module.exports = sequelize;

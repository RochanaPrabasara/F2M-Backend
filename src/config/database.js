// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// If Render (or any other platform) provides a full connection string via
// DATABASE_URL we prefer that.  Sequelize understands a URL, so we can
// simply pass it directly.  Otherwise fall back to the separate
// POSTGRES_* variables used locally.

// We also enable SSL when using a URL, which is required on Render's
// managed Postgres service; the `rejectUnauthorized: false` option
// allows self-signed certificates used by many cloud providers.
const connectionString = process.env.DATABASE_URL || null;

const options = connectionString
  ? {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          // Some providers use self‑signed certs
          rejectUnauthorized: false,
        },
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  : {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };

const sequelize = connectionString
  ? new Sequelize(connectionString, options)
  : new Sequelize(
      process.env.POSTGRES_DB,
      process.env.POSTGRES_USER,
      process.env.POSTGRES_PASSWORD,
      options
    );

module.exports = sequelize;
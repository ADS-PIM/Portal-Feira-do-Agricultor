const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const shared = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'api_portal_feira',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false,
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  },
};

module.exports = {
  development: shared,
  test: {
    ...shared,
    database: process.env.DB_TEST_NAME || `${shared.database}_test`,
  },
  production: shared,
};

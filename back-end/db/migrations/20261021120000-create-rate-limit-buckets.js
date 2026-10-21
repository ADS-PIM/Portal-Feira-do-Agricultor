'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('rate_limit_buckets', {
      bucket_key: { type: DataTypes.STRING(64), allowNull: false, primaryKey: true },
      tokens: { type: DataTypes.DOUBLE, allowNull: false },
      updated_at_ms: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      expires_at_ms: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    }, { engine: 'InnoDB' });
    await queryInterface.addIndex('rate_limit_buckets', ['expires_at_ms'], { name: 'rate_limit_buckets_expiry' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rate_limit_buckets');
  },
};

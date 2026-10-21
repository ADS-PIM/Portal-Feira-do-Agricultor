'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('password_reset_tokens', {
      adminId: {
        type: DataTypes.CHAR(36), allowNull: false, primaryKey: true,
        references: { model: 'administrators', key: 'id' }, onDelete: 'CASCADE',
      },
      tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      passwordHashAtRequest: { type: DataTypes.STRING(255), allowNull: false },
      emailAtRequest: { type: DataTypes.STRING(320), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
    }, { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_general_ci' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('password_reset_tokens');
  },
};

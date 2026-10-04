'use strict';

const { Sequelize } = require('sequelize');

const tableOptions = {
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  engine: 'InnoDB',
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('administrators', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: {
        type: Sequelize.STRING(320),
        allowNull: false,
        unique: 'administrators_unique',
      },
      hashPassword: { type: Sequelize.STRING(255), allowNull: false },
      role: {
        type: Sequelize.ENUM('normal', 'master'),
        allowNull: false,
      },
      active: { type: Sequelize.BOOLEAN, allowNull: false },
      createdAt: { type: Sequelize.DATEONLY, allowNull: false },
      profile_picture: { type: Sequelize.STRING(2048), allowNull: true },
    }, tableOptions);
    await queryInterface.addIndex('administrators', ['email'], {
      unique: true,
      name: 'administrators_unique',
    });

    await queryInterface.createTable('events', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      description: { type: Sequelize.STRING(1000), allowNull: true },
      startAt: { type: Sequelize.TIME, allowNull: false },
      endAt: { type: Sequelize.TIME, allowNull: false },
      localAddress: { type: Sequelize.STRING(255), allowNull: false },
      localLatitude: { type: Sequelize.DECIMAL(10, 8), allowNull: false },
      localLongitude: { type: Sequelize.DECIMAL(11, 8), allowNull: false },
      state: {
        type: Sequelize.ENUM(
          'PENDING',
          'CANCELED',
          'CONCLUDED',
          'RESCHEDULED',
          'HAPPENING',
        ),
        allowNull: false,
      },
      bannerImage: { type: Sequelize.STRING(2048), allowNull: true },
      createdAt: { type: Sequelize.DATEONLY, allowNull: false },
      administratorId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'administrators', key: 'id' },
      },
    }, tableOptions);

    await queryInterface.createTable('images', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      imageUrl: { type: Sequelize.STRING(2048), allowNull: false },
      description: { type: Sequelize.STRING(1000), allowNull: true },
      eventId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'events', key: 'id' },
      },
    }, tableOptions);

    await queryInterface.createTable('businessInfo', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      instagramAccount: { type: Sequelize.STRING(64), allowNull: false },
      whatsappNumber: { type: Sequelize.STRING(20), allowNull: false },
      businessEmail: { type: Sequelize.STRING(320), allowNull: false },
      businessHours: { type: Sequelize.STRING(255), allowNull: false },
      updatedAt: { type: Sequelize.DATEONLY, allowNull: false },
    }, tableOptions);

    await queryInterface.createTable('message', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(320), allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      subject: {
        type: Sequelize.ENUM(
          'DOUBT',
          'SUGGESTION',
          'COMPLAINT',
          'PARTNERSHIP',
          'OTHER',
        ),
        allowNull: false,
      },
      message: { type: Sequelize.STRING(1500), allowNull: false },
      submitDate: { type: Sequelize.DATE, allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
    }, tableOptions);
    await queryInterface.sequelize.query(
      'ALTER TABLE `message` MODIFY COLUMN `submitDate` TIMESTAMP NOT NULL',
    );

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.CHAR(36), allowNull: false, primaryKey: true },
      adminId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'administrators', key: 'id' },
      },
      tokenHash: { type: Sequelize.STRING(281), allowNull: false },
      createdAt: { type: Sequelize.DATEONLY, allowNull: false },
      expiresAt: { type: Sequelize.DATEONLY, allowNull: false },
      revokedAt: { type: Sequelize.DATEONLY, allowNull: true },
    }, tableOptions);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('message');
    await queryInterface.dropTable('businessInfo');
    await queryInterface.dropTable('images');
    await queryInterface.dropTable('events');
    await queryInterface.dropTable('administrators');
  },
};

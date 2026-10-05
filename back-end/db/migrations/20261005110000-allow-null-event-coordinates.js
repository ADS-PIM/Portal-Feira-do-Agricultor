'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `events` MODIFY COLUMN `localLatitude` DECIMAL(10, 8) NULL DEFAULT NULL',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `events` MODIFY COLUMN `localLongitude` DECIMAL(11, 8) NULL DEFAULT NULL',
    );
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS nullCoordinates FROM `events` WHERE `localLatitude` IS NULL OR `localLongitude` IS NULL',
    );
    if (Number(rows[0].nullCoordinates) > 0) {
      throw new Error('Cannot make event coordinates required while events contain NULL coordinates');
    }

    await queryInterface.sequelize.query(
      'ALTER TABLE `events` MODIFY COLUMN `localLatitude` DECIMAL(10, 8) NOT NULL',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `events` MODIFY COLUMN `localLongitude` DECIMAL(11, 8) NOT NULL',
    );
  },
};

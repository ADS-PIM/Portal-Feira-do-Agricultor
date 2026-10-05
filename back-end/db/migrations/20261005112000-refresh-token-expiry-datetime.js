'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `refresh_tokens` MODIFY COLUMN `expiresAt` DATETIME NOT NULL',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `refresh_tokens` MODIFY COLUMN `expiresAt` DATE NOT NULL',
    );
  },
};

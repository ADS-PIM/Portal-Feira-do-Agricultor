'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE `administrators` MODIFY COLUMN `role` ENUM('normal', 'master', 'ADMIN', 'SUPER_ADMIN') NOT NULL",
    );
    await queryInterface.sequelize.query(
      "UPDATE `administrators` SET `role` = CASE `role` WHEN 'normal' THEN 'ADMIN' WHEN 'master' THEN 'SUPER_ADMIN' ELSE `role` END",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `administrators` MODIFY COLUMN `role` ENUM('ADMIN', 'SUPER_ADMIN') NOT NULL",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE `administrators` MODIFY COLUMN `role` ENUM('ADMIN', 'SUPER_ADMIN', 'normal', 'master') NOT NULL",
    );
    await queryInterface.sequelize.query(
      "UPDATE `administrators` SET `role` = CASE `role` WHEN 'ADMIN' THEN 'normal' WHEN 'SUPER_ADMIN' THEN 'master' ELSE `role` END",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE `administrators` MODIFY COLUMN `role` ENUM('normal', 'master') NOT NULL",
    );
  },
};

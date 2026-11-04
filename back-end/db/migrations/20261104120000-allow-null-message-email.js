'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('message', 'email', {
      type: Sequelize.STRING(320),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE message SET email = '' WHERE email IS NULL");
    await queryInterface.changeColumn('message', 'email', {
      type: Sequelize.STRING(320),
      allowNull: false,
    });
  },
};

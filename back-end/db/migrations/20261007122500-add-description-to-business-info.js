'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('businessInfo', 'description', {
      type: Sequelize.STRING(1000),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('businessInfo', 'description');
  },
};

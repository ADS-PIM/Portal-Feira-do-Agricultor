'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.changeColumn('events', 'createdAt', {
      type: Sequelize.DATE(6),
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP(6)'),
    });
  },

  async down(queryInterface) {
    await queryInterface.changeColumn('events', 'createdAt', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
  },
};

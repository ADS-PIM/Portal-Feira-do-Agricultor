'use strict';

const { Sequelize } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // Existing DATE values retain their date; previously discarded hours cannot be recovered.
    await queryInterface.changeColumn('businessInfo', 'updatedAt', {
      type: Sequelize.DATE(3),
      allowNull: false,
    });
    // Preserve the legacy calendar date at midnight in São Paulo when reading as UTC.
    await queryInterface.sequelize.query('UPDATE businessInfo SET updatedAt = DATE_ADD(updatedAt, INTERVAL 3 HOUR)');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('UPDATE businessInfo SET updatedAt = DATE_SUB(updatedAt, INTERVAL 3 HOUR)');
    await queryInterface.changeColumn('businessInfo', 'updatedAt', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });
  },
};

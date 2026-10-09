'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('businessInfo', 'instagramAccount', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.changeColumn('businessInfo', 'whatsappNumber', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.changeColumn('businessInfo', 'businessEmail', {
      type: Sequelize.STRING(320),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE businessInfo SET instagramAccount = COALESCE(instagramAccount, ''), whatsappNumber = COALESCE(whatsappNumber, ''), businessEmail = COALESCE(businessEmail, '')"
    );
    await queryInterface.changeColumn('businessInfo', 'instagramAccount', {
      type: Sequelize.STRING(64),
      allowNull: false,
    });
    await queryInterface.changeColumn('businessInfo', 'whatsappNumber', {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
    await queryInterface.changeColumn('businessInfo', 'businessEmail', {
      type: Sequelize.STRING(320),
      allowNull: false,
    });
  },
};
'use strict';

const { Sequelize, QueryTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.changeColumn('businessInfo', 'description', {
      type: Sequelize.STRING(2000),
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    const [result] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS total FROM businessInfo WHERE CHAR_LENGTH(description) > 1000',
      { type: QueryTypes.SELECT },
    );
    if (Number(result.total) > 0) {
      throw new Error('Não é possível reduzir description para 1000 caracteres: existem textos maiores que esse limite.');
    }
    await queryInterface.changeColumn('businessInfo', 'description', {
      type: Sequelize.STRING(1000),
      allowNull: true,
      defaultValue: null,
    });
  },
};

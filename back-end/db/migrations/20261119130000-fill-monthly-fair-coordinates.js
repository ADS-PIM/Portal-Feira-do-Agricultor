'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE events
      SET localLatitude = -5.246268, localLongitude = -38.130419
      WHERE administratorId IS NULL
        AND localAddress = 'Praça da Matriz, Centro, Tabuleiro do Norte, Ceará, Brasil'
        AND localLatitude IS NULL AND localLongitude IS NULL
    `);
  },

  async down() {
    // Coordinates are editable event data. Keep the saved map positions on rollback.
  },
};

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE events MODIFY administratorId CHAR(36) NULL');
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS monthly_fair_dates (
        scheduledDate DATE NOT NULL PRIMARY KEY
      ) ENGINE=InnoDB
    `);
  },

  async down(queryInterface) {
    const [events] = await queryInterface.sequelize.query('SELECT id FROM events WHERE administratorId IS NULL LIMIT 1');
    if (events.length) {
      throw new Error('Assign an administrator to system-created events before reverting this migration.');
    }
    await queryInterface.sequelize.query('ALTER TABLE events MODIFY administratorId CHAR(36) NOT NULL');
    await queryInterface.dropTable('monthly_fair_dates');
  },
};

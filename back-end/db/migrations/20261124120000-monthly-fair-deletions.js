'use strict';

module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('events');
    if (!indexes.some(index => index.name === 'events_date_idx')) {
      await queryInterface.addIndex('events', ['date'], { name: 'events_date_idx' });
    }
    const columns = await queryInterface.describeTable('monthly_fair_dates');
    if (columns.manuallyDeleted && !columns.manuallyDeleted.allowNull) return;
    if (!columns.manuallyDeleted) {
      await queryInterface.sequelize.query(
        'ALTER TABLE monthly_fair_dates ADD COLUMN manuallyDeleted BOOLEAN NULL'
      );
    }
    // The old scheduler kept the date after either a deletion or a move.
    // Keep empty legacy dates available for the administrator to restore.
    await queryInterface.sequelize.query(`
      UPDATE monthly_fair_dates
      SET manuallyDeleted = NOT EXISTS (SELECT 1 FROM events WHERE events.date = monthly_fair_dates.scheduledDate)
      WHERE manuallyDeleted IS NULL
    `);
    await queryInterface.sequelize.query(
      'ALTER TABLE monthly_fair_dates MODIFY manuallyDeleted BOOLEAN NOT NULL DEFAULT FALSE'
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('monthly_fair_dates', 'manuallyDeleted');
    await queryInterface.removeIndex('events', 'events_date_idx');
  },
};

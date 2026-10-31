'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('event_locations', {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      address: { type: DataTypes.STRING(255), allowNull: false },
      latitude: { type: DataTypes.DECIMAL(9, 6), allowNull: false },
      longitude: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
      lastUsedAt: { type: DataTypes.DATE(6), allowNull: false },
    }, { engine: 'InnoDB' });
    await queryInterface.addIndex('event_locations', ['latitude', 'longitude'], { unique: true, name: 'event_locations_coordinates' });
    await queryInterface.addIndex('event_locations', ['lastUsedAt'], { name: 'event_locations_recent' });
    // Preserve locations even if their original event is later changed or deleted.
    // Oldest first lets the most recent event supply the label of duplicate points.
    await queryInterface.sequelize.query(`
      INSERT INTO event_locations (address, latitude, longitude, lastUsedAt)
      SELECT LEFT(TRIM(localAddress), 255), ROUND(localLatitude, 6), ROUND(localLongitude, 6), createdAt
      FROM events
      WHERE localLatitude BETWEEN -90 AND 90 AND localLongitude BETWEEN -180 AND 180
        AND TRIM(localAddress) <> ''
      ORDER BY createdAt ASC, id ASC
      ON DUPLICATE KEY UPDATE address = VALUES(address), lastUsedAt = VALUES(lastUsedAt)
    `);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('event_locations');
  },
};

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE administrators
      ADD COLUMN deactivatedAt DATETIME(3) NULL,
      ADD COLUMN reactivatedAt DATETIME(3) NULL,
      ADD COLUMN reactivatedBy CHAR(36) NULL,
      ADD COLUMN mustResetPassword TINYINT(1) NOT NULL DEFAULT 0,
      ADD COLUMN anonymizedAt DATETIME(3) NULL,
      ADD CONSTRAINT administrators_reactivated_by_fk FOREIGN KEY (reactivatedBy)
        REFERENCES administrators(id) ON DELETE RESTRICT ON UPDATE CASCADE`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE administrators
      DROP FOREIGN KEY administrators_reactivated_by_fk,
      DROP COLUMN anonymizedAt,
      DROP COLUMN mustResetPassword,
      DROP COLUMN reactivatedBy,
      DROP COLUMN reactivatedAt,
      DROP COLUMN deactivatedAt`);
  },
};

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE refresh_tokens
      ADD COLUMN sessionId CHAR(36) NULL,
      ADD COLUMN replacedByTokenId CHAR(36) NULL,
      ADD COLUMN rotatedAt DATETIME(3) NULL,
      ADD INDEX refreshTokens_session_idx (sessionId)`);
  },

  async down(queryInterface) {
    // Used tokens must not become usable again when their rotation metadata is removed.
    await queryInterface.sequelize.query('DELETE FROM refresh_tokens WHERE rotatedAt IS NOT NULL');
    await queryInterface.sequelize.query(`ALTER TABLE refresh_tokens
      DROP INDEX refreshTokens_session_idx,
      DROP COLUMN rotatedAt,
      DROP COLUMN replacedByTokenId,
      DROP COLUMN sessionId`);
  },
};

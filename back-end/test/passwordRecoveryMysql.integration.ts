import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import { PasswordResetDAO } from '../src/dao/passwordReset.dao';
import { RefreshTokenDAO } from '../src/dao/refreshToken.dao';
import { PasswordCrypto } from '../src/service/passwordCrypto';
import { hashResetToken } from '../src/service/passwordReset.service';

// Explicit command, isolated random schema; never modifies the application's tables.
const config = require('../db/config/config.js').test;
const initial = require('../db/migrations/20261004190000-create-initial-schema.js');
const refreshExpiry = require('../db/migrations/20261005112000-refresh-token-expiry-datetime.js');
const migration = require('../db/migrations/20261021150000-create-password-reset-tokens.js');

test('MySQL: migration, expiry, replacement, atomic use, password hashing, session revocation and rollback', { timeout: 120_000 }, async () => {
    const database = `password_reset_test_${randomUUID().replace(/-/g, '')}`;
    assert.match(database, /^password_reset_test_[a-f0-9]{32}$/);
    const options = { host: config.host, port: config.port, user: config.username, password: config.password,
        ssl: config.dialectOptions?.ssl, connectionLimit: 5, connectTimeout: 10_000 };
    const adminPool = mysql.createPool(options);
    const pool = mysql.createPool({ ...options, database });
    const sequelize = new Sequelize(database, config.username, config.password, {
        host: config.host, port: config.port, dialect: 'mysql', dialectOptions: config.dialectOptions, logging: false,
    });
    let created = false;
    try {
        await adminPool.query(`CREATE DATABASE \`${database}\``);
        created = true;
        await initial.up(sequelize.getQueryInterface());
        await refreshExpiry.up(sequelize.getQueryInterface());
        await migration.up(sequelize.getQueryInterface());
        const dao = new PasswordResetDAO(pool);
        const refresh = new RefreshTokenDAO(pool);
        const adminId = randomUUID();
        const oldHash = await PasswordCrypto.hashPassword('OldPassword123');
        const newHash = await PasswordCrypto.hashPassword('NewPassword456');
        await pool.execute(`INSERT INTO administrators (id, name, email, hashPassword, role, active, createdAt)
            VALUES (?, 'Test', 'admin@example.com', ?, 'normal', 1, CURRENT_DATE)`, [adminId, oldHash]);
        const tokenHash = () => hashResetToken(randomBytes(32).toString('hex'));
        const issue = async () => { const hash = tokenHash(); assert.ok(await dao.issue('admin@example.com', hash)); return hash; };
        const getPassword = async () => {
            const [rows] = await pool.query<RowDataPacket[]>('SELECT hashPassword FROM administrators WHERE id = ?', [adminId]);
            return rows[0].hashPassword;
        };
        assert.equal(await dao.issue('unknown@example.com', tokenHash()), null);
        assert.equal(await dao.consume(tokenHash(), newHash), false);
        const first = await issue();
        const second = await issue();
        assert.equal(await dao.consume(first, newHash), false);
        await pool.execute('UPDATE password_reset_tokens SET expiresAt = DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 SECOND)');
        assert.equal(await dao.consume(second, newHash), false);
        assert.equal(await getPassword(), oldHash);

        const changedPasswordToken = await issue();
        await pool.execute('UPDATE administrators SET hashPassword = ? WHERE id = ?', [newHash, adminId]);
        assert.equal(await dao.consume(changedPasswordToken, oldHash), false);
        const changedEmailToken = await issue();
        await pool.execute("UPDATE administrators SET email = 'changed@example.com' WHERE id = ?", [adminId]);
        assert.equal(await dao.consume(changedEmailToken, oldHash), false);
        await pool.execute("UPDATE administrators SET email = 'admin@example.com', active = 0 WHERE id = ?", [adminId]);
        assert.equal(await dao.issue('admin@example.com', tokenHash()), null);
        assert.equal(await dao.consume(changedEmailToken, oldHash), false);
        await pool.execute('UPDATE administrators SET active = 1, hashPassword = ? WHERE id = ?', [oldHash, adminId]);

        const current = await issue();
        await pool.execute(`INSERT INTO refresh_tokens (id, tokenHash, adminId, createdAt, expiresAt)
            VALUES (?, 'old-refresh', ?, CURRENT_DATE, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY))`, [randomUUID(), adminId]);
        const results = await Promise.all(Array.from({ length: 8 }, () => dao.consume(current, newHash)));
        assert.equal(results.filter(Boolean).length, 1);
        assert.ok(await PasswordCrypto.verifyPassword('NewPassword456', await getPassword()));
        assert.equal(await PasswordCrypto.verifyPassword('OldPassword123', await getPassword()), false);
        const [sessions] = await pool.query<RowDataPacket[]>('SELECT * FROM refresh_tokens WHERE adminId = ?', [adminId]);
        assert.equal(sessions.length, 0);
        assert.equal(await refresh.rotate('old-refresh', randomUUID(), 'new-refresh', adminId, new Date(Date.now() + 86400000)), false);

        const racingToken = await issue();
        await pool.execute(`INSERT INTO refresh_tokens (id, tokenHash, adminId, createdAt, expiresAt)
            VALUES (?, 'racing-refresh', ?, CURRENT_DATE, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY))`, [randomUUID(), adminId]);
        const [consumed] = await Promise.all([
            dao.consume(racingToken, oldHash),
            refresh.rotate('racing-refresh', randomUUID(), 'racing-replacement', adminId, new Date(Date.now() + 86400000)),
        ]);
        assert.equal(consumed, true);
        const [afterRace] = await pool.query<RowDataPacket[]>('SELECT * FROM refresh_tokens WHERE adminId = ?', [adminId]);
        assert.equal(afterRace.length, 0);

        // Force an error after the password update; the transaction must restore both password and link.
        const rollbackToken = await issue();
        await pool.query('RENAME TABLE refresh_tokens TO refresh_tokens_test_unavailable');
        await assert.rejects(dao.consume(rollbackToken, newHash));
        assert.equal(await getPassword(), oldHash);
        await pool.query('RENAME TABLE refresh_tokens_test_unavailable TO refresh_tokens');
        assert.equal(await dao.consume(rollbackToken, newHash), true);
        await migration.down(sequelize.getQueryInterface());
        assert.ok(!(await sequelize.getQueryInterface().showAllTables()).includes('password_reset_tokens'));
    } finally {
        await Promise.all([pool.end(), sequelize.close()]);
        if (created) await adminPool.query(`DROP DATABASE \`${database}\``);
        await adminPool.end();
    }
});

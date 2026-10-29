import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import { AdminDAO } from '../src/dao/admin.dao';

// Explicit invocation only; all writes use a disposable schema, never the application's schema.
const config = require('../db/config/config.js').test;
const initial = require('../db/migrations/20261004190000-create-initial-schema.js');
const roles = require('../db/migrations/20261005103000-align-administrator-roles.js');
const refreshExpiry = require('../db/migrations/20261005112000-refresh-token-expiry-datetime.js');
const passwordReset = require('../db/migrations/20261021150000-create-password-reset-tokens.js');

test('MySQL: administrator deletion requires deactivation, protects events and principal admins, and rolls back atomically', { timeout: 120_000 }, async () => {
    const database = `admin_delete_test_${randomUUID().replace(/-/g, '')}`;
    assert.match(database, /^admin_delete_test_[a-f0-9]{32}$/);
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
        await roles.up(sequelize.getQueryInterface());
        await refreshExpiry.up(sequelize.getQueryInterface());
        await passwordReset.up(sequelize.getQueryInterface());
        const dao = new AdminDAO(pool);
        const createAdmin = async (role = 'ADMIN', active = false) => {
            const id = randomUUID();
            await pool.execute(`INSERT INTO administrators (id, name, email, hashPassword, role, active, createdAt)
                VALUES (?, 'Test', ?, 'test-password-hash', ?, ?, CURRENT_DATE)`, [id, `${id}@example.com`, role, active]);
            return id;
        };
        const createSession = async (adminId: string) => {
            await pool.execute(`INSERT INTO refresh_tokens (id, tokenHash, adminId, createdAt, expiresAt)
                VALUES (?, ?, ?, CURRENT_DATE, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 DAY))`, [randomUUID(), randomUUID(), adminId]);
        };
        const createReset = async (adminId: string) => {
            await pool.execute(`INSERT INTO password_reset_tokens
                (adminId, tokenHash, passwordHashAtRequest, emailAtRequest, createdAt, expiresAt)
                VALUES (?, ?, 'test-password-hash', ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE))`,
            [adminId, randomBytes(32).toString('hex'), `${adminId}@example.com`]);
        };
        const count = async (table: 'administrators' | 'refresh_tokens' | 'password_reset_tokens' | 'events', adminId: string) => {
            const column = table === 'administrators' ? 'id' : table === 'events' ? 'administratorId' : 'adminId';
            const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table} WHERE ${column} = ?`, [adminId]);
            return Number(rows[0].total);
        };

        const unrelated = await createAdmin();
        await createSession(unrelated);
        await createReset(unrelated);
        const target = await createAdmin('ADMIN', true);
        await createSession(target);
        await createSession(target);
        await createReset(target);

        // Reproduces the former DAO's direct DELETE failure after an administrator has logged in.
        await assert.rejects(pool.execute('DELETE FROM administrators WHERE id = ?', [target]),
            (error: any) => error.code === 'ER_ROW_IS_REFERENCED_2');
        assert.equal(await dao.delete(target), 'active');
        assert.equal(await count('administrators', target), 1);
        assert.equal(await count('refresh_tokens', target), 2);
        assert.equal(await count('password_reset_tokens', target), 1);
        await dao.update(target, { active: false });
        assert.equal(await dao.delete(target), 'deleted');
        assert.equal(await count('administrators', target), 0);
        assert.equal(await count('refresh_tokens', target), 0);
        assert.equal(await count('password_reset_tokens', target), 0);
        assert.equal(await count('administrators', unrelated), 1);
        assert.equal(await count('refresh_tokens', unrelated), 1);
        assert.equal(await count('password_reset_tokens', unrelated), 1);
        assert.equal(await dao.delete(target), 'not_found');

        const principal = await createAdmin('SUPER_ADMIN', true);
        await createSession(principal);
        await createReset(principal);
        assert.equal(await dao.delete(principal), 'super_admin');
        assert.equal(await count('administrators', principal), 1);
        assert.equal(await count('refresh_tokens', principal), 1);
        assert.equal(await count('password_reset_tokens', principal), 1);
        await dao.update(principal, { active: false });
        assert.equal(await dao.delete(principal), 'super_admin');

        const eventAdmin = await createAdmin();
        await createSession(eventAdmin);
        await createReset(eventAdmin);
        await pool.execute(`INSERT INTO events
            (id, title, date, startAt, endAt, localAddress, state, createdAt, administratorId)
            VALUES (?, 'Event history', CURRENT_DATE, '08:00:00', '12:00:00', 'Test address', 'CONCLUDED', CURRENT_DATE, ?)`,
        [randomUUID(), eventAdmin]);
        assert.equal(await dao.delete(eventAdmin), 'has_events');
        assert.equal(await count('events', eventAdmin), 1);
        assert.equal(await count('administrators', eventAdmin), 1);
        assert.equal(await count('refresh_tokens', eventAdmin), 1);
        assert.equal(await count('password_reset_tokens', eventAdmin), 1);

        const rollbackAdmin = await createAdmin();
        await createSession(rollbackAdmin);
        await createReset(rollbackAdmin);
        // Fails after refresh-token deletion, proving rollback restores the session as well as the account.
        await pool.query(`CREATE TRIGGER fail_admin_delete BEFORE DELETE ON administrators
            FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced deletion failure'`);
        try {
            await assert.rejects(dao.delete(rollbackAdmin));
            assert.equal(await count('administrators', rollbackAdmin), 1);
            assert.equal(await count('refresh_tokens', rollbackAdmin), 1);
            assert.equal(await count('password_reset_tokens', rollbackAdmin), 1);
        } finally {
            await pool.query('DROP TRIGGER fail_admin_delete');
        }
        assert.equal(await dao.delete(rollbackAdmin), 'deleted');

        const racingAdmin = await createAdmin();
        await createSession(racingAdmin);
        const outcomes = await Promise.all([dao.delete(racingAdmin), dao.delete(racingAdmin)]);
        assert.deepEqual(outcomes.sort(), ['deleted', 'not_found']);
        assert.equal(await count('administrators', racingAdmin), 0);
        assert.equal(await count('refresh_tokens', racingAdmin), 0);
    } finally {
        await Promise.all([pool.end(), sequelize.close()]);
        if (created) await adminPool.query(`DROP DATABASE \`${database}\``);
        await adminPool.end();
    }
});

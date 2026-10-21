import type { Pool, RowDataPacket } from 'mysql2/promise';
import { connection } from '../util/connection';

export class PasswordResetDAO {
    constructor(private pool: Pool = connection) {}

    async issue(email: string, tokenHash: string): Promise<{ email: string } | null> {
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            // The administrator lock serializes issuing and consuming links.
            const [admins] = await db.execute<RowDataPacket[]>(
                'SELECT id, email, hashPassword, active FROM administrators WHERE email = ? FOR UPDATE', [email]);
            const admin = admins[0];
            if (!admin?.active) {
                await db.rollback();
                return null;
            }
            await db.execute(`INSERT INTO password_reset_tokens
                (adminId, tokenHash, passwordHashAtRequest, emailAtRequest, createdAt, expiresAt)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE))
                ON DUPLICATE KEY UPDATE tokenHash = VALUES(tokenHash),
                    passwordHashAtRequest = VALUES(passwordHashAtRequest), emailAtRequest = VALUES(emailAtRequest),
                    createdAt = VALUES(createdAt), expiresAt = VALUES(expiresAt)`,
            [admin.id, tokenHash, admin.hashPassword, admin.email]);
            await db.commit();
            return { email: admin.email };
        } catch (error) {
            await db.rollback();
            throw error;
        } finally {
            db.release();
        }
    }

    async discard(tokenHash: string): Promise<void> {
        await this.pool.execute('DELETE FROM password_reset_tokens WHERE tokenHash = ?', [tokenHash]);
    }

    async consume(tokenHash: string, passwordHash: string): Promise<boolean> {
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            const [candidates] = await db.execute<RowDataPacket[]>(
                'SELECT adminId FROM password_reset_tokens WHERE tokenHash = ?', [tokenHash]);
            if (!candidates[0]) {
                await db.rollback();
                return false;
            }
            const adminId = candidates[0].adminId;
            const [admins] = await db.execute<RowDataPacket[]>(
                'SELECT email, hashPassword, active FROM administrators WHERE id = ? FOR UPDATE', [adminId]);
            // Locking read observes a concurrently consumed/replaced token, even under REPEATABLE READ.
            const [tokens] = await db.execute<RowDataPacket[]>(`SELECT passwordHashAtRequest, emailAtRequest
                FROM password_reset_tokens WHERE adminId = ? AND tokenHash = ?
                AND expiresAt > CURRENT_TIMESTAMP FOR UPDATE`, [adminId, tokenHash]);
            const admin = admins[0];
            const token = tokens[0];
            if (!admin?.active || !token || token.passwordHashAtRequest !== admin.hashPassword
                || token.emailAtRequest !== admin.email) {
                await db.rollback();
                return false;
            }
            await db.execute('UPDATE administrators SET hashPassword = ? WHERE id = ?', [passwordHash, adminId]);
            await db.execute('DELETE FROM password_reset_tokens WHERE adminId = ?', [adminId]);
            await db.execute('DELETE FROM refresh_tokens WHERE adminId = ?', [adminId]);
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        } finally {
            db.release();
        }
    }
}

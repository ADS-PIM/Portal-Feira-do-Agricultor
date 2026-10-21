import { connection } from '../util/connection';
import type { Pool, RowDataPacket } from 'mysql2/promise';

export type RefreshTokenRow = {
    id: string;
}

export class RefreshTokenDAO {
    constructor(private pool: Pool = connection) {}

    async rotate(oldToken: string, id: string, token: string, adminId: string, expiresAt: Date): Promise<boolean> {
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            // Same lock order as password recovery: a revoked session cannot be recreated by a racing refresh.
            const [admins] = await db.execute<RowDataPacket[]>(
                'SELECT active FROM administrators WHERE id = ? FOR UPDATE', [adminId]);
            const [stored] = await db.execute<RowDataPacket[]>(
                'SELECT id FROM refresh_tokens WHERE tokenHash = ? AND adminId = ? AND expiresAt > CURRENT_TIMESTAMP FOR UPDATE', [oldToken, adminId]);
            if (!admins[0]?.active || !stored[0]) {
                await db.rollback();
                return false;
            }
            await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [stored[0].id]);
            await db.execute('INSERT INTO refresh_tokens (id, tokenHash, adminId, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)',
                [id, token, adminId, expiresAt, new Date()]);
            await db.commit();
            return true;
        } catch (error) {
            await db.rollback();
            throw error;
        } finally {
            db.release();
        }
    }

    async create(id: string, token: string, adminId: string, expiresAt: Date): Promise<void> {
        try {
            await this.pool.query(
                `INSERT INTO refresh_tokens (id, tokenHash, adminId, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?)`,
                [id, token, adminId, expiresAt, new Date()]
            );
        } catch (error) {
            console.error('Error creating refresh token:', error);
            throw new Error('Failed to create refresh token');
        }
    }

    async findByToken(token: string): Promise<RefreshTokenRow | null> {
        try {
            const [rows] = await this.pool.query<RowDataPacket[]>(
                'SELECT id FROM refresh_tokens WHERE tokenHash = ?',
                [token]
            );
            if (rows.length === 0) return null;
            return { id: String(rows[0].id) };
        } catch (error) {
            console.error('Error finding refresh token:', error);
            throw new Error('Failed to find refresh token');
        }
    }

    async deleteByToken(token: string): Promise<void> {
        try {
            await this.pool.query('DELETE FROM refresh_tokens WHERE tokenHash = ?', [token]);
        } catch (error) {
            console.error('Error deleting refresh token:', error);
            throw new Error('Failed to delete refresh token');
        }
    }

    async deleteByUserId(userId: string): Promise<void> {
        try {
            await this.pool.query('DELETE FROM refresh_tokens WHERE adminId = ?', [userId]);
        } catch (error) {
            console.error('Error deleting refresh tokens for user:', error);
            throw new Error('Failed to delete refresh tokens for user');
        }
    }
}

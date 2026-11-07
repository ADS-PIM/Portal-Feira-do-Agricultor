import { connection } from '../util/connection';
import type { Pool, RowDataPacket } from 'mysql2/promise';

export type RefreshTokenRow = {
    id: string;
}

export type RefreshTokenRotation = { token: string; expiresAt: Date };
const ROTATION_OVERLAP_SECONDS = 30;

export class RefreshTokenDAO {
    constructor(private pool: Pool = connection) {}

    async rotate(oldToken: string, id: string, token: string, adminId: string, expiresAt: Date): Promise<RefreshTokenRotation | null> {
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            // Same lock order as password recovery: a revoked session cannot be recreated by a racing refresh.
            const [admins] = await db.execute<RowDataPacket[]>(
                'SELECT active FROM administrators WHERE id = ? FOR UPDATE', [adminId]);
            const [stored] = await db.execute<RowDataPacket[]>(
                `SELECT id, COALESCE(sessionId, id) AS sessionId, tokenHash, expiresAt, rotatedAt, replacedByTokenId,
                 rotatedAt >= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL ${ROTATION_OVERLAP_SECONDS} SECOND) AS withinOverlap
                 FROM refresh_tokens WHERE tokenHash = ? AND adminId = ? AND expiresAt > CURRENT_TIMESTAMP
                 AND revokedAt IS NULL FOR UPDATE`, [oldToken, adminId]);
            if (!admins[0]?.active || !stored[0]) {
                await db.rollback();
                return null;
            }
            const previous = stored[0];
            if (previous.rotatedAt) {
                if (!previous.withinOverlap) {
                    await db.rollback();
                    return null;
                }
                // A reload may lose the response that set the new cookie. Reuse the same
                // live successor for a short interval, including concurrent tab requests.
                let current = previous;
                for (let depth = 0; current.replacedByTokenId && depth < 64; depth++) {
                    const [successors] = await db.execute<RowDataPacket[]>(
                        `SELECT id, tokenHash, expiresAt, rotatedAt, replacedByTokenId FROM refresh_tokens
                         WHERE id = ? AND adminId = ? AND sessionId = ? AND expiresAt > CURRENT_TIMESTAMP
                         AND revokedAt IS NULL FOR UPDATE`, [current.replacedByTokenId, adminId, previous.sessionId]);
                    if (!successors[0]) {
                        await db.rollback();
                        return null;
                    }
                    current = successors[0];
                }
                if (current.rotatedAt || current.replacedByTokenId) {
                    await db.rollback();
                    return null;
                }
                await db.commit();
                return { token: String(current.tokenHash), expiresAt: new Date(current.expiresAt) };
            }
            await db.execute('UPDATE refresh_tokens SET rotatedAt = CURRENT_TIMESTAMP(3), replacedByTokenId = ? WHERE id = ?',
                [id, previous.id]);
            await db.execute('INSERT INTO refresh_tokens (id, tokenHash, adminId, expiresAt, createdAt, sessionId) VALUES (?, ?, ?, ?, ?, ?)',
                [id, token, adminId, expiresAt, new Date(), previous.sessionId]);
            await db.execute(`DELETE FROM refresh_tokens WHERE adminId = ? AND (sessionId = ? OR id = ?)
                AND rotatedAt < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL ${ROTATION_OVERLAP_SECONDS} SECOND)`,
                [adminId, previous.sessionId, previous.sessionId]);
            await db.commit();
            return { token, expiresAt };
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
                `INSERT INTO refresh_tokens (id, tokenHash, adminId, expiresAt, createdAt, sessionId) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, token, adminId, expiresAt, new Date(), id]
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
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            const [candidates] = await db.execute<RowDataPacket[]>('SELECT adminId FROM refresh_tokens WHERE tokenHash = ?', [token]);
            if (candidates[0]) {
                const adminId = candidates[0].adminId;
                // Serialize logout with rotation so an in-flight refresh cannot resurrect it.
                await db.execute('SELECT id FROM administrators WHERE id = ? FOR UPDATE', [adminId]);
                const [sessions] = await db.execute<RowDataPacket[]>(
                    'SELECT COALESCE(sessionId, id) AS sessionId FROM refresh_tokens WHERE tokenHash = ? AND adminId = ? FOR UPDATE', [token, adminId]);
                if (sessions[0]) {
                    await db.execute('DELETE FROM refresh_tokens WHERE adminId = ? AND (sessionId = ? OR id = ?)',
                        [adminId, sessions[0].sessionId, sessions[0].sessionId]);
                }
            }
            await db.commit();
        } catch (error) {
            await db.rollback();
            console.error('Error deleting refresh token:', error);
            throw new Error('Failed to delete refresh token');
        } finally {
            db.release();
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

import { connection } from '../util/connection';
import type { RowDataPacket } from 'mysql2';

export type RefreshTokenRow = {
    id: string;
}

export class RefreshTokenDAO {
    async create(id: string, token: string, adminId: string, expiresAt: Date): Promise<void> {
        try {
            await connection.query(
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
            const [rows] = await connection.query<RowDataPacket[]>(
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
            await connection.query('DELETE FROM refresh_tokens WHERE tokenHash = ?', [token]);
        } catch (error) {
            console.error('Error deleting refresh token:', error);
            throw new Error('Failed to delete refresh token');
        }
    }

    async deleteByUserId(userId: string): Promise<void> {
        try {
            await connection.query('DELETE FROM refresh_tokens WHERE adminId = ?', [userId]);
        } catch (error) {
            console.error('Error deleting refresh tokens for user:', error);
            throw new Error('Failed to delete refresh tokens for user');
        }
    }
}

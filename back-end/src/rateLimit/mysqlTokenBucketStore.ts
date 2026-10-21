import type { Pool, RowDataPacket } from 'mysql2/promise';
import { consumeToken, type BucketPolicy, type BucketResult, type TokenBucketStore } from './tokenBucket';

export class MySQLTokenBucketStore implements TokenBucketStore {
    private nextCleanupAt = 0;

    constructor(private pool: Pool) {}

    async consume(key: string, policy: BucketPolicy): Promise<BucketResult> {
        // Cleanup is bounded and runs outside the bucket transaction to avoid
        // holding locks on unrelated identities. Only fully refilled rows expire.
        if (Date.now() >= this.nextCleanupAt) {
            this.nextCleanupAt = Date.now() + 60_000;
            try {
                await this.pool.execute(`DELETE FROM rate_limit_buckets
                    WHERE expires_at_ms <= UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 LIMIT 500`);
            } catch {
                // A cleanup failure must not reset or bypass an active limit.
            }
        }

        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            // The upsert acquires an exclusive row lock, including for new keys.
            // Unlike INSERT IGNORE, concurrent initializations do not upgrade shared locks.
            await db.execute(`INSERT INTO rate_limit_buckets (bucket_key, tokens, updated_at_ms, expires_at_ms)
                VALUES (?, ?, UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000,
                    UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 + ?)
                ON DUPLICATE KEY UPDATE bucket_key = bucket_key`, [key, policy.capacity, policy.refillIntervalMs]);
            const [rows] = await db.execute<RowDataPacket[]>(`SELECT tokens, updated_at_ms,
                UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS now_ms
                FROM rate_limit_buckets WHERE bucket_key = ? FOR UPDATE`, [key]);
            const row = rows[0];
            const result = consumeToken({ tokens: Number(row.tokens), updatedAt: Number(row.updated_at_ms) },
                policy, Number(row.now_ms));
            await db.execute(`UPDATE rate_limit_buckets SET tokens = ?, updated_at_ms = ?, expires_at_ms = ?
                WHERE bucket_key = ?`, [result.tokens, result.updatedAt, result.updatedAt + policy.refillIntervalMs, key]);
            await db.commit();
            return result;
        } catch (error) {
            await db.rollback().catch(() => {});
            throw error;
        } finally {
            db.release();
        }
    }
}

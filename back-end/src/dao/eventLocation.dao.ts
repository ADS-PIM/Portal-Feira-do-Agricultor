import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { connection } from '../util/connection';

export async function rememberEventLocation(db: PoolConnection, eventId: string): Promise<void> {
    await db.query(`INSERT INTO event_locations (address, latitude, longitude, lastUsedAt)
        SELECT TRIM(localAddress), ROUND(localLatitude, 6), ROUND(localLongitude, 6), CURRENT_TIMESTAMP(6)
        FROM events WHERE id = ? AND localLatitude BETWEEN -90 AND 90
            AND localLongitude BETWEEN -180 AND 180 AND TRIM(localAddress) <> ''
        ON DUPLICATE KEY UPDATE address = VALUES(address), lastUsedAt = VALUES(lastUsedAt)`, [eventId]);
}

export async function searchLocationHistory(query: string) {
    // '=' is the LIKE escape character so user-entered '%' and '_' stay literal.
    const pattern = `%${query.replace(/[=%_]/g, '=$&')}%`;
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT id, address, latitude, longitude, lastUsedAt
        FROM event_locations WHERE address LIKE ? ESCAPE '='
        ORDER BY lastUsedAt DESC, id DESC LIMIT 30`, [pattern]);
    return rows.map(row => ({ ...row, latitude: Number(row.latitude), longitude: Number(row.longitude) }));
}

import { randomUUID } from 'node:crypto'
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { rememberEventLocation } from './eventLocation.dao'

const title = 'Brotando Feiras'
const address = 'Praça da Matriz, Centro, Tabuleiro do Norte, Ceará, Brasil'
const latitude = -5.246268
const longitude = -38.130419

export function monthlyFairDates(today: string): string[] {
    const [year, month] = today.split('-').map(Number)
    const dates: string[] = []
    // Include this month's fair if it is still ahead or today, plus the next six months.
    for (let offset = 0; offset <= 6; offset++) {
        const first = new Date(Date.UTC(year, month - 1 + offset, 1))
        first.setUTCDate(1 + (6 - first.getUTCDay()))
        const saturday = first.toISOString().slice(0, 10)
        if (saturday >= today) dates.push(saturday)
    }
    return dates
}

export async function ensureMonthlyFairs(pool: Pool, today: string): Promise<void> {
    const dates = monthlyFairDates(today)
    const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT DATE_FORMAT(scheduledDate, '%Y-%m-%d') AS scheduledDate FROM monthly_fair_dates WHERE scheduledDate IN (?)",
        [dates],
    )
    const scheduled = new Set(rows.map(row => row.scheduledDate))
    const missing = dates.filter(date => !scheduled.has(date))
    if (!missing.length) return

    const db = await pool.getConnection()
    try {
        await db.beginTransaction()
        for (const date of missing) {
            // Keep the original slot even if an administrator later moves or deletes the event.
            const [slot] = await db.execute<ResultSetHeader>(
                'INSERT IGNORE INTO monthly_fair_dates (scheduledDate) VALUES (?)', [date],
            )
            if (!slot.affectedRows) continue
            const eventId = randomUUID()
            const [event] = await db.execute<ResultSetHeader>(
                `INSERT INTO events (id, title, date, startAt, endAt, localAddress, localLatitude, localLongitude, state, createdAt)
                 SELECT ?, ?, ?, '06:00', '12:00', ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP(6)
                 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM events WHERE date = ? AND title = ?)`,
                [eventId, title, date, address, latitude, longitude, date, title],
            )
            if (event.affectedRows) await rememberEventLocation(db, eventId)
        }
        await db.commit()
    } catch (error) {
        await db.rollback()
        throw error
    } finally {
        db.release()
    }
}

import { randomUUID } from 'node:crypto'
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise'
import { rememberEventLocation } from './eventLocation.dao'

const title = 'Brotando Feiras'
const address = 'Praça da Matriz, Centro, Tabuleiro do Norte, Ceará, Brasil'
const latitude = -5.246268
const longitude = -38.130419

export function monthlyFairDates(today: string): string[] {
    const [year, month] = today.split('-').map(Number)
    const dates: string[] = []
    for (let offset = 0; dates.length < 6; offset++) {
        const first = new Date(Date.UTC(year, month - 1 + offset, 1))
        first.setUTCDate(1 + (6 - first.getUTCDay()))
        const saturday = first.toISOString().slice(0, 10)
        if (saturday >= today) dates.push(saturday)
    }
    return dates
}

// Both the scheduler and administrator writes lock the same row until commit.
export async function lockMonthlyFairDate(db: PoolConnection, date: string | Date): Promise<void> {
    await db.query(`
        INSERT INTO monthly_fair_dates (scheduledDate)
        SELECT fairDate FROM (SELECT DATE(?) AS fairDate) AS candidate
        WHERE DAYOFMONTH(fairDate) <= 7 AND DAYOFWEEK(fairDate) = 7
        ON DUPLICATE KEY UPDATE scheduledDate = candidate.fairDate
    `, [date])
}

export async function suppressDeletedMonthlyFair(db: PoolConnection, eventId: string): Promise<void> {
    const [events] = await db.query<RowDataPacket[]>(`
        SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date,
            (DAYOFMONTH(date) <= 7 AND DAYOFWEEK(date) = 7) AS firstSaturday
        FROM events WHERE id = ? FOR UPDATE
    `, [eventId])
    if (!events[0]?.firstSaturday) return

    const date: string = events[0].date
    await lockMonthlyFairDate(db, date)
    const [others] = await db.query<RowDataPacket[]>(
        'SELECT 1 FROM events WHERE date = ? AND id <> ? LIMIT 1', [date, eventId],
    )
    if (!others.length) {
        await db.query('UPDATE monthly_fair_dates SET manuallyDeleted = TRUE WHERE scheduledDate = ?', [date])
    }
}

export async function fillMonthlyFair(pool: Pool, date: string, recreate = false): Promise<boolean> {
    const db = await pool.getConnection()
    try {
        await db.beginTransaction()
        await lockMonthlyFairDate(db, date)
        const [[slot]] = await db.query<RowDataPacket[]>(`
            SELECT manuallyDeleted, EXISTS (SELECT 1 FROM events WHERE date = ?) AS occupied
            FROM monthly_fair_dates WHERE scheduledDate = ?
        `, [date, date])
        if (recreate && slot.manuallyDeleted) {
            await db.query('UPDATE monthly_fair_dates SET manuallyDeleted = FALSE WHERE scheduledDate = ?', [date])
        }
        const create = !slot.occupied && (!slot.manuallyDeleted || recreate)
        if (create) {
            const eventId = randomUUID()
            await db.execute(`
                INSERT INTO events (id, title, date, startAt, endAt, localAddress, localLatitude, localLongitude, state, createdAt)
                VALUES (?, ?, ?, '06:00', '12:00', ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP(6))
            `, [eventId, title, date, address, latitude, longitude])
            await rememberEventLocation(db, eventId)
        }
        await db.commit()
        return create
    } catch (error) {
        await db.rollback()
        throw error
    } finally {
        db.release()
    }
}

export async function ensureMonthlyFairs(pool: Pool, today: string): Promise<void> {
    const dates = monthlyFairDates(today)
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT DISTINCT DATE_FORMAT(date, '%Y-%m-%d') AS date FROM events WHERE date IN (?)
        UNION ALL
        SELECT DATE_FORMAT(scheduledDate, '%Y-%m-%d') AS date FROM monthly_fair_dates
        WHERE scheduledDate IN (?) AND manuallyDeleted = TRUE
    `, [dates, dates])
    const covered = new Set(rows.map(row => row.date))
    for (const date of dates) {
        if (!covered.has(date)) await fillMonthlyFair(pool, date)
    }
}

export async function missingMonthlyFairDates(pool: Pool, today: string): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT DATE_FORMAT(scheduledDate, '%Y-%m-%d') AS date FROM monthly_fair_dates
        WHERE scheduledDate IN (?) AND manuallyDeleted = TRUE
          AND NOT EXISTS (SELECT 1 FROM events WHERE date = monthly_fair_dates.scheduledDate)
        ORDER BY scheduledDate
    `, [monthlyFairDates(today)])
    return rows.map(row => row.date)
}

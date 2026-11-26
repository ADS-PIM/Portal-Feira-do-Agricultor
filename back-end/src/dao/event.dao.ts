import { connection } from '../util/connection'
import { randomUUID } from 'node:crypto'
import type { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise'
import { rememberEventLocation } from './eventLocation.dao'
import { Event, EventState } from '../model/event'
import { AdminEventSearchDTO, EventAgendaScope, EventAgendaSearchDTO, EventNearestSearchDTO, EventSearchByIdDTO, EventSearchDTO } from '../dto/event.dto'
import { eventLocalTimestamp } from '../util/eventTime'
import { ensureMonthlyFairs, fillMonthlyFair, lockMonthlyFairDate, missingMonthlyFairDates, monthlyFairDates, suppressDeletedMonthlyFair } from './monthlyFair.dao'
import { ActionError } from '../model/actionError'

async function synchronizeEventStates(db: Pick<PoolConnection, 'query'>, now: Date, eventId?: string): Promise<number> {
    const timestamp = eventLocalTimestamp(now)
    // One conditional UPDATE keeps concurrent edits/cancellations safe and repeated
    // executions harmless. Canceled, rescheduled and concluded states are preserved.
    const [result] = await db.query<ResultSetHeader>(`
        UPDATE events
        SET state = CASE WHEN TIMESTAMP(date, endAt) <= ? THEN ? ELSE ? END
        WHERE (
            (state = ? AND TIMESTAMP(date, startAt) <= ?)
            OR (state = ? AND TIMESTAMP(date, endAt) <= ?)
        )${eventId === undefined ? '' : ' AND id = ?'}
    `, [
        timestamp, EventState.CONCLUDED, EventState.HAPPENING,
        EventState.PENDING, timestamp,
        EventState.HAPPENING, timestamp,
        ...(eventId === undefined ? [] : [eventId]),
    ])
    return result.affectedRows
}

export type EventUpdateData = {
    title?: string;
    date?: Date;
    description?: string;
    startAt?: string;
    endAt?: string;
    localAddress?: string;
    latitude?: number | null;
    longitude?: number | null;
    state?: EventState;
    bannerImage?: string | null;
}

export class EventDAO {
    constructor(private pool: Pool = connection, private now: () => Date = () => new Date()) {}

    public async synchronizeStates(): Promise<number> {
        const now = this.now()
        await ensureMonthlyFairs(this.pool, eventLocalTimestamp(now).slice(0, 10))
        return synchronizeEventStates(this.pool, now)
    }

    public async searchMissingMonthlyFairDates(): Promise<string[]> {
        return missingMonthlyFairDates(this.pool, eventLocalTimestamp(this.now()).slice(0, 10))
    }

    public async recreateMonthlyFair(date: string): Promise<boolean> {
        if (!monthlyFairDates(eventLocalTimestamp(this.now()).slice(0, 10)).includes(date)) {
            throw new ActionError(400, 'INVALID_MONTHLY_FAIR_DATE', 'A data deve ser um dos seis próximos primeiros sábados.')
        }
        return fillMonthlyFair(this.pool, date, true)
    }

    public async create(event: Event): Promise <void> {
        const dbConnection = await this.pool.getConnection()
        try {
            await dbConnection.beginTransaction()
            await lockMonthlyFairDate(dbConnection, event.date)
            await dbConnection.query('INSERT INTO events (id, title, date, description, startAt, endAt, localAddress, localLatitude, localLongitude, state, bannerImage, createdAt, administratorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(6), ?) ', [
                event.id,
                event.title,
                event.date,
                event.description,
                event.startAt,
                event.endAt,
                event.localAddress,
                event.latitude,
                event.longitude,
                event.state,
                event.bannerImage,
                event.adminId
            ]);
            if (event.bannerImage) {
                await this.syncBannerImage(dbConnection, event.id, event.bannerImage)
            }
            if (event.latitude != null && event.longitude != null) await rememberEventLocation(dbConnection, event.id)
            await synchronizeEventStates(dbConnection, this.now(), event.id)
            await dbConnection.commit()
        } catch (error: any) {
            await dbConnection.rollback()
            throw new Error('Error creating event: ' + error.message)
        } finally {
            dbConnection.release()
        }
    }

    public async searchById(id: string): Promise<EventSearchByIdDTO | null> {
        try {
            await this.synchronizeStates()
            const [events]: any = await this.pool.query('SELECT * FROM events WHERE id = ?', [id]);
            if (events.length === 0) {
                return null
            }

            return events[0];
        } catch (error: any) {
            throw new Error('Error searching event by id: ' + error.message);
        }
    }

    public async searchAll(): Promise<EventSearchDTO[] | null> {
        try {
            await this.synchronizeStates()
            const [events]: any = await this.pool.query(
                "SELECT id, title, date, description, startAt, endAt, localAddress, localLatitude, localLongitude, state, bannerImage, DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s.%f') AS createdAt FROM events ORDER BY createdAt DESC, id DESC"
            );
            return events.length === 0 ? null : events;
        } catch (error: any) {
            throw new Error('Error searching events: ' + error.message);
        }
    }

    public async searchForAdmin(): Promise<AdminEventSearchDTO[]> {
        await this.synchronizeStates()
        const [events]: any = await this.pool.query(`
            SELECT e.id, e.title, e.date, e.description, e.startAt, e.endAt, e.localAddress,
                e.localLatitude, e.localLongitude, e.state, e.bannerImage, DATE_FORMAT(e.createdAt, '%Y-%m-%d %H:%i:%s.%f') AS createdAt,
                e.administratorId, COALESCE(a.name, 'Sistema') AS administratorName, a.active AS administratorActive
            FROM events e
            LEFT JOIN administrators a ON a.id = e.administratorId
            ORDER BY e.createdAt DESC, e.id DESC
        `);
        return events.map((event: AdminEventSearchDTO) => ({
            ...event,
            administratorActive: Boolean(event.administratorActive),
        }));
    }

    public async searchNearest(date: string): Promise<EventNearestSearchDTO | null> {
        try {
            await this.synchronizeStates()
            const [events]: any = await this.pool.query(
                `SELECT id, title, description, localAddress, date, startAt, endAt, bannerImage
                FROM events
                WHERE date >= ? AND state IN (?, ?, ?)
                ORDER BY date ASC, startAt ASC
                LIMIT 1`,
                [date, EventState.HAPPENING, EventState.PENDING, EventState.RESCHEDULED]
            );
            return events.length === 0 ? null : events[0];
        } catch (error: any) {
            throw new Error('Error searching nearest event: ' + error.message);
        }
    }

    public async searchAgenda(date: string, scope: EventAgendaScope = 'upcoming'): Promise<EventAgendaSearchDTO[]> {
        try {
            await this.synchronizeStates()
            const periodStart = scope === 'year' ? `${date.slice(0, 4)}-01-01` : `${date.slice(0, 7)}-01`;
            const interval = scope === 'year' ? '1 YEAR' : '1 MONTH';
            const [events]: any = await this.pool.query(
                `SELECT id, title, DATE_FORMAT(date, '%Y-%m-%d') AS date, startAt, endAt, localAddress, state
                FROM events
                WHERE ${scope === 'upcoming'
                    ? 'date >= ? AND state IN (?, ?, ?)'
                    : `date >= ? AND date < DATE_ADD(?, INTERVAL ${interval})`}
                ORDER BY date ASC, startAt ASC, id ASC`,
                scope === 'upcoming' ? [date, EventState.HAPPENING, EventState.PENDING, EventState.RESCHEDULED] : [periodStart, periodStart]
            );
            return events;
        } catch (error: any) {
            throw new Error('Error searching event agenda: ' + error.message);
        }
    }

    public async update(id: string, data: EventUpdateData): Promise<void> {
        const fields: string[] = []
        const values: any[] = []

        if (data.title !== undefined) {
            fields.push('title = ?'); values.push(data.title)
        };

        if (data.date !== undefined) {
            fields.push('date = ?'); values.push(data.date)
        };

        if (data.description !== undefined) {
            fields.push('description = ?'); values.push(data.description)
        };

        if (data.startAt !== undefined) {
            fields.push('startAt = ?'); values.push(data.startAt)
        };

        if (data.endAt !== undefined) {
            fields.push('endAt = ?'); values.push(data.endAt)
        };

        if (data.localAddress !== undefined) {
            fields.push('localAddress = ?'); values.push(data.localAddress)
        };

        if (data.latitude !== undefined) {
            fields.push('localLatitude = ?'); values.push(data.latitude)
        };

        if (data.longitude !== undefined) {
            fields.push('localLongitude = ?'); values.push(data.longitude)
        };

        if (data.state !== undefined) {
            fields.push('state = ?'); values.push(data.state)
        };

        if (data.bannerImage !== undefined) {
            fields.push('bannerImage = ?'); values.push(data.bannerImage)
        };

        if (fields.length === 0 && data.bannerImage === undefined) {
            return;
        }

        const dbConnection = await this.pool.getConnection()
        try {
            await dbConnection.beginTransaction()
            if (data.date !== undefined) {
                await dbConnection.query('SELECT id FROM events WHERE id = ? FOR UPDATE', [id])
                await lockMonthlyFairDate(dbConnection, data.date)
            }
            if (fields.length > 0) {
                await dbConnection.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
            }
            if (data.bannerImage !== undefined) {
                await this.syncBannerImage(dbConnection, id, data.bannerImage)
            }
            if (data.latitude !== undefined || data.longitude !== undefined || data.localAddress !== undefined) {
                await rememberEventLocation(dbConnection, id)
            }
            await synchronizeEventStates(dbConnection, this.now(), id)
            await dbConnection.commit()
        } catch (error: any) {
            await dbConnection.rollback()
            throw new Error('Error updating event: ' + error.message)
        } finally {
            dbConnection.release()
        }
    }

    private async syncBannerImage(dbConnection: PoolConnection, eventId: string, imageURL: string | null): Promise<void> {
        const description = 'Banner do evento'
        if (!imageURL) {
            await dbConnection.query('DELETE FROM images WHERE eventId = ? AND description = ?', [eventId, description])
            return
        }

        const [rows]: any = await dbConnection.query(
            'SELECT id FROM images WHERE eventId = ? AND description = ? LIMIT 1',
            [eventId, description],
        )
        if (rows.length) {
            await dbConnection.query('UPDATE images SET imageUrl = ? WHERE id = ?', [imageURL, rows[0].id])
            return
        }

        await dbConnection.query(
            'INSERT INTO images (id, imageUrl, description, eventId) VALUES (?, ?, ?, ?)',
            [randomUUID(), imageURL, description, eventId],
        )
    }

    public async delete(id: string): Promise<void> {
        const dbConnection = await this.pool.getConnection()
        try {
            await dbConnection.beginTransaction()
            await suppressDeletedMonthlyFair(dbConnection, id)
            await dbConnection.query('DELETE FROM images WHERE eventId = ?', [id])
            await dbConnection.query('DELETE FROM events WHERE id = ?', [id])
            await dbConnection.commit()
        } catch (error: any) {
            await dbConnection.rollback()
            throw new Error('Error deleting event: ' + error.message)
        } finally {
            dbConnection.release()
        }
    }
}

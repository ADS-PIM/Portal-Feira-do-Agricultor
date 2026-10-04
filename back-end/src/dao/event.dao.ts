import { connection } from '../util/connection'
import { randomUUID } from 'node:crypto'
import type { PoolConnection } from 'mysql2/promise'
import { Event, EventState } from '../model/event'
import { EventAgendaSearchDTO, EventNearestSearchDTO, EventSearchByIdDTO, EventSearchDTO } from '../dto/event.dto'

export type EventUpdateData = {
    title?: string;
    date?: Date;
    description?: string;
    startAt?: string;
    endAt?: string;
    localAddress?: string;
    latitude?: number;
    longitude?: number;
    state?: EventState;
    bannerImage?: string | null;
}

export class EventDAO {
    public async create(event: Event): Promise <void> {
        const dbConnection = await connection.getConnection()
        try {
            await dbConnection.beginTransaction()
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
            const [events]: any = await connection.query('SELECT * FROM events WHERE id = ?', [id]);
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
            const [events]: any = await connection.query(
                "SELECT id, title, date, description, startAt, endAt, localAddress, state, bannerImage, DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s.%f') AS createdAt FROM events ORDER BY createdAt DESC, id DESC"
            );
            return events.length === 0 ? null : events;
        } catch (error: any) {
            throw new Error('Error searching events: ' + error.message);
        }
    }

    public async searchNearest(date: string): Promise<EventNearestSearchDTO | null> {
        try {
            const [events]: any = await connection.query(
                `SELECT id, title, description, localAddress, date, startAt, endAt, bannerImage
                FROM events
                WHERE date >= ? AND state IN (?, ?)
                ORDER BY date ASC, startAt ASC
                LIMIT 1`,
                [date, EventState.HAPPENING, EventState.PENDING]
            );
            return events.length === 0 ? null : events[0];
        } catch (error: any) {
            throw new Error('Error searching nearest event: ' + error.message);
        }
    }

    public async searchAgenda(date: string): Promise<EventAgendaSearchDTO[]> {
        try {
            const [events]: any = await connection.query(
                `SELECT id, title, DATE_FORMAT(date, '%Y-%m-%d') AS date, startAt, endAt, localAddress
                FROM events
                WHERE date >= ? AND state IN (?, ?)
                ORDER BY date ASC, startAt ASC`,
                [date, EventState.HAPPENING, EventState.PENDING]
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
            fields.push('latitude = ?'); values.push(data.latitude)
        };

        if (data.longitude !== undefined) {
            fields.push('longitude = ?'); values.push(data.longitude)
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

        const dbConnection = await connection.getConnection()
        try {
            await dbConnection.beginTransaction()
            if (fields.length > 0) {
                await dbConnection.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
            }
            if (data.bannerImage !== undefined) {
                await this.syncBannerImage(dbConnection, id, data.bannerImage)
            }
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
        const dbConnection = await connection.getConnection()
        try {
            await dbConnection.beginTransaction()
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

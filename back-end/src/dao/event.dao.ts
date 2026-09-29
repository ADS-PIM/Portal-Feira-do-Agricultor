import { connection } from '../util/connection'
import { Event, EventState } from '../model/event'
import { EventSearchDTO } from '../dto/event.dto'

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
    bannerImage?: string;
}

export class EventDAO {
    public async create(event: Event): Promise <void> {
        try {
            await connection.query('INSERT INTO events (id, title, date, description, startAt, endAt, localAddress, localLatitude, localLongitude, state, bannerImage, createdAt, administratorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ', [
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
                event.createdAt,
                event.adminId
            ]);
        } catch (error: any) {
            throw new Error('Error creating event: ' + error.message)
        }
    }

    public async searchById(id: string): Promise<Event | null> {
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
                'SELECT id, title, date, startAt, endAt, state, bannerImage FROM events'
            );
            return events.length === 0 ? null : events;
        } catch (error: any) {
            throw new Error('Error searching events: ' + error.message);
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

        if (fields.length === 0) {
            return;
        }

        try {
            await connection.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`,[...values, id]);
        } catch (error: any) {
            throw new Error('Error updating event: ' + error.message)
        }
    }

    public async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM events WHERE id = ?', [id])
        } catch (error: any) {
            throw new Error('Error deleting event: ' + error.message)
        }
    }
}


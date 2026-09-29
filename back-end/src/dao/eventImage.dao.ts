import { connection } from '../util/connection'
import { EventImageSearchByEventId } from '../dto/eventImage.dto'
import { EventImage } from '../model/eventImage'

export type EventImageUpdateData = {
    imageURL?: string;
    description?: string;
}

export class EventImageDAO {
    public async create(eventImage: EventImage): Promise <void> {
        try{
            await connection.query('INSERT INTO images (id, imageURL, description, eventId) VALUES (?, ?, ?, ?)', [eventImage.id, eventImage.imageURL,  eventImage.description, eventImage.eventId])
        } catch (error: any) {
            throw new Error('Error creating image: ' + error.message)
        }
    }

    public async searchById(id: string): Promise<{ id: string; imageURL: string; description: string; eventId: string } | null> {
        try {
            const [rows]: any = await connection.query('SELECT id, imageUrl AS imageURL, description, eventId FROM images WHERE id = ?', [id]);
            if (rows.length === 0) {
                return null;
            }

            return {
                id: rows[0].id,
                imageURL: rows[0].imageURL,
                description: rows[0].description,
                eventId: rows[0].eventId
            };
        } catch (error: any) {
            throw new Error('Error searching image by id: ' + error.message);
        }
    }

    public async update(id: string, data: EventImageUpdateData): Promise<void> {
        const fields: string[] = [];
        const values: string[] = [];

        if (data.imageURL !== undefined) {
            fields.push('imageUrl = ?');
            values.push(data.imageURL);
        }

        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }

        if (fields.length === 0) {
            return;
        }

        try {
            await connection.query(`UPDATE images SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
        } catch (error: any) {
            throw new Error('Error updating image: ' + error.message);
        }
    }

    public async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM images WHERE id = ?', [id]);
        } catch (error: any) {
            throw new Error('Error deleting image: ' + error.message);
        }
    }

    public async searchByEventId(eventId: string): Promise<EventImageSearchByEventId[] | null> {
        try {
            const [rows]: any = await connection.query(
                'SELECT id, imageUrl AS imageURL, description FROM images WHERE eventId = ?',
                [eventId]
            );
            return rows.length === 0 ? null : rows;
        } catch (error: any) {
            throw new Error('Error searching images by event id: ' + error.message);
        }
    }
}
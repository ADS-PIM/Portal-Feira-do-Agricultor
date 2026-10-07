import { connection } from '../util/connection';
import { RowDataPacket } from 'mysql2';
import { MessageSearchDTO } from '../dto/message.dto';
import { Message, MessageSubject, propsMessage } from '../model/message';

export class MessageDAO {
    public async create(message: Message): Promise<void> {
        try {
            await connection.query(
                'INSERT INTO message (id, name, email, phone, subject, message, submitDate, title) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    message.id,
                    message.name,
                    message.email,
                    message.phone || null,
                    message.subject.toLowerCase(),
                    message.message,
                    message.submitDate,
                    message.title
                ]
            );
        } catch (error: any) {
            throw new Error('Error creating message: ' + error.message);
        }
    }

    public async search(): Promise<MessageSearchDTO[]> {
        try {
            const [rows] = await connection.query<(RowDataPacket & MessageSearchDTO)[]>(
                'SELECT id, title, subject, name, email, phone, message, submitDate, isRead FROM message ORDER BY submitDate DESC'
            );
            return rows.map((row) => Object.assign(new MessageSearchDTO(), {
                ...row,
                isRead: Boolean(row.isRead),
            }));
        } catch (error: any) {
            throw new Error('Error retrieving messages: ' + error.message);
        }
    }

    public async searchById(id: string): Promise<propsMessage | null> {
        try {
            const [rows] = await connection.query<(RowDataPacket & propsMessage)[]>(
                'SELECT id, name, email, phone, subject, message, submitDate, title FROM message WHERE id = ?',
                [id]
            );
            if (rows.length === 0) {
                return null;
            }

            return {
                ...rows[0],
                subject: rows[0].subject.toUpperCase() as MessageSubject
            };
        } catch (error: any) {
            throw new Error('Error retrieving message: ' + error.message);
        }
    }

    public async markAsRead(id: string): Promise<boolean> {
        try {
            const [result]: any = await connection.query(
                'UPDATE message SET isRead = TRUE WHERE id = ?',
                [id],
            );
            if (result.affectedRows > 0) return true;

            const [rows]: any = await connection.query('SELECT id FROM message WHERE id = ?', [id]);
            return rows.length > 0;
        } catch (error: any) {
            throw new Error('Error marking message as read: ' + error.message);
        }
    }

    public async delete(id: string): Promise<boolean> {
        try {
            const [result]: any = await connection.query('DELETE FROM message WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error: any) {
            throw new Error('Error deleting message: ' + error.message);
        }
    }
}
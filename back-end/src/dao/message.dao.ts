import { connection } from '../util/connection';
import { Message } from '../model/message';

export class MessageDAO {
    public async create(message: Message): Promise<void> {
        try {
            await connection.query(
                'INSERT INTO message (id, name, email, phone, subject, message, submitDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                    message.id,
                    message.name,
                    message.email,
                    message.phone || null,
                    message.subject.toLowerCase(),
                    message.message,
                    message.submitDate
                ]
            );
        } catch (error: any) {
            throw new Error('Error creating message: ' + error.message);
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
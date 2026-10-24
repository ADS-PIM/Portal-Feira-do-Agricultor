import { connection } from '../util/connection';
import { Admin } from '../model/admin';
import { AdminSearchByIdDTO, AdminSearchDTO } from '../dto/admin.dto';
import type { Pool, RowDataPacket } from 'mysql2/promise';

export type AdminDeleteResult = 'deleted' | 'not_found' | 'super_admin' | 'has_events';

export type AdminUpdateData = {
    name?: string;
    email?: string;
    password?: string;
    role?: Admin['role'];
    active?: boolean;
    profile_picture?: string | null;
};

export class AdminDAO {
    constructor(private pool: Pool = connection) {}

    public async register(admin: Admin): Promise<void> {
        try {
            const [result]: any = await this.pool.query(
                'INSERT INTO administrators (id, name, email, hashPassword, role, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [admin.id, admin.name, admin.email, admin.password, admin.role, admin.active, admin.createdAt]
            );
        } catch (error: any) {
            throw new Error('Error registering admin: ' + error.message);
        }
    }

    async searchByEmail(email: string): Promise<Admin | null> {
        try {
            const [admin]: any = await this.pool.query(
                'SELECT id, name, email, hashPassword AS password, role, active, createdAt, profile_picture FROM administrators WHERE email = ?',
                [email]
            );
            if (admin.length == 0) {
                return null;
            }
            return admin[0];
        } catch (error: any) {
            throw new Error('Error searching admin by email: ' + error.message);
        }
    }

    async searchById(id: string): Promise<Admin | null> {
        try {
            const [admins]: any = await this.pool.query(
                'SELECT id, name, email, hashPassword AS password, role, active, createdAt, profile_picture FROM administrators WHERE id = ?',
                [id]
            );
            return admins.length === 0 ? null : admins[0];
        } catch (error: any) {
            throw new Error('Error searching admin by id: ' + error.message);
        }
    }

    async searchPublicById(id: string): Promise<AdminSearchByIdDTO | null> {
        try {
            const [admins]: any = await this.pool.query(
                'SELECT id, name, email, role, active, createdAt, profile_picture FROM administrators WHERE id = ?',
                [id]
            );
            return admins.length === 0 ? null : admins[0];
        } catch (error: any) {
            throw new Error('Error searching admin by id: ' + error.message);
        }
    }

    async searchAll(): Promise<AdminSearchDTO[] | null> {
        try {
            const [admins]: any = await this.pool.query(
                'SELECT id, name, email, role, active, profile_picture, createdAt FROM administrators ORDER BY createdAt DESC'
            );
            return admins.length === 0 ? [] : admins;
        } catch (error: any) {
            throw new Error('Error searching admins: ' + error.message);
        }
    }

    async update(id: string, data: AdminUpdateData): Promise<void> {
        const fields: string[] = [];
        const values: (string | boolean | null)[] = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.email !== undefined) {
            fields.push('email = ?');
            values.push(data.email);
        }
        if (data.password !== undefined) {
            fields.push('hashPassword = ?');
            values.push(data.password);
        }
        if (data.role !== undefined) {
            fields.push('role = ?');
            values.push(data.role);
        }
        if (data.active !== undefined) {
            fields.push('active = ?');
            values.push(data.active);
        }
        if (data.profile_picture !== undefined) {
            fields.push('profile_picture = ?');
            values.push(data.profile_picture);
        }

        if (fields.length === 0) {
            return;
        }

        try {
            await this.pool.query(
                `UPDATE administrators SET ${fields.join(', ')} WHERE id = ?`,
                [...values, id]
            );
        } catch (error: any) {
            throw new Error('Error updating admin: ' + error.message);
        }
    }

    async delete(id: string): Promise<AdminDeleteResult> {
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            // Use the same lock order as refresh and password recovery.
            const [admins] = await db.execute<RowDataPacket[]>(
                'SELECT role FROM administrators WHERE id = ? FOR UPDATE', [id]);
            if (!admins[0]) {
                await db.rollback();
                return 'not_found';
            }
            if (admins[0].role === 'SUPER_ADMIN') {
                await db.rollback();
                return 'super_admin';
            }

            // Preserve event history and explain the conflict instead of exposing a foreign-key error.
            const [events] = await db.execute<RowDataPacket[]>(
                'SELECT id FROM events WHERE administratorId = ? LIMIT 1 FOR UPDATE', [id]);
            if (events.length > 0) {
                await db.rollback();
                return 'has_events';
            }

            await db.execute('DELETE FROM refresh_tokens WHERE adminId = ?', [id]);
            await db.execute('DELETE FROM administrators WHERE id = ?', [id]);
            // Password-reset tokens are removed by their existing ON DELETE CASCADE constraint.
            await db.commit();
            return 'deleted';
        } catch (error) {
            await db.rollback();
            throw error;
        } finally {
            db.release();
        }
    }
}

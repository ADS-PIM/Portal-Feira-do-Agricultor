import { connection } from '../util/connection';
import { Admin } from '../model/admin';
import { AdminSearchDTO } from '../dto/admin.dto';

export type AdminUpdateData = {
    name?: string;
    email?: string;
    password?: string;
    role?: Admin['role'];
    active?: boolean;
    profile_picture?: string | null;
};

export class AdminDAO {
    public async register(admin: Admin): Promise<void> {
        try {
            const [result]: any = await connection.query(
                'INSERT INTO administrators (id, name, email, hashPassword, role, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [admin.id, admin.name, admin.email, admin.password, admin.role, admin.active, admin.createdAt]
            );
        } catch (error: any) {
            throw new Error('Error registering admin: ' + error.message);
        }
    }

    async searchByEmail(email: string): Promise<Admin | null> {
        try {
            const [admin]: any = await connection.query(
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
            const [admin]: any = await connection.query(
                'SELECT id, name, email, hashPassword AS password, role, active, createdAt, profile_picture FROM administrators WHERE id = ?',
                [id]
            );
            if (admin.length === 0) {
                return null;
            }
            return admin[0];
        } catch (error: any) {
            throw new Error('Error searching admin by id: ' + error.message);
        }
    }

    async searchAll(): Promise<AdminSearchDTO[] | null> {
        try {
            const [admins]: any = await connection.query(
                'SELECT id, name, email, role, active, createdAt, profile_picture FROM administrators'
            );
            if (admins.length === 0) {
                return null;
            }
            return admins;
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
            await connection.query(
                `UPDATE administrators SET ${fields.join(', ')} WHERE id = ?`,
                [...values, id]
            );
        } catch (error: any) {
            throw new Error('Error updating admin: ' + error.message);
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await connection.query('DELETE FROM administrators WHERE id = ?', [id]);
        } catch (error: any) {
            throw new Error('Error deleting admin: ' + error.message);
        }
    }
}

import { connection } from '../util/connection';
import { Admin } from '../model/admin';
import { AdminSearchByIdDTO, AdminSearchDTO } from '../dto/admin.dto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { AdminActionError } from '../model/adminActionError';

export type AdminDeleteResult = 'deleted' | 'not_found' | 'super_admin' | 'active' | 'has_events'
    | 'forbidden' | 'invalid_password' | 'last_super_admin';

// Updates and deletions share one lock order. Concurrent departures cannot both
// decide that the other principal administrator will remain available.
const lockAdministrators = 'SELECT id, role, active FROM administrators ORDER BY id FOR UPDATE';

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

    async update(id: string, data: AdminUpdateData, actorId: string): Promise<void> {
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

        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            const [admins] = await db.execute<RowDataPacket[]>(lockAdministrators);
            const actor = admins.find(admin => admin.id === actorId);
            const target = admins.find(admin => admin.id === id);
            const isSelf = actorId === id;
            const isSuper = actor?.role === 'SUPER_ADMIN';
            const allowedFields = isSuper
                ? ['name', 'email', 'role', 'active', 'profile_picture', ...(isSelf ? ['password'] : [])]
                : ['name', 'password', 'profile_picture'];
            if (!actor?.active || (!isSelf && !isSuper) ||
                Object.keys(data).some(field => !allowedFields.includes(field))) {
                throw new AdminActionError(403, 'ADMIN_UPDATE_FORBIDDEN', 'You cannot update this administrator');
            }
            if (!target) throw new AdminActionError(404, 'ADMIN_NOT_FOUND', 'Admin not found');
            const isPeerReactivation = isSuper && data.active === true && Object.keys(data).length === 1;
            if (!isSelf && target.role === 'SUPER_ADMIN' && !isPeerReactivation) {
                throw new AdminActionError(403, 'SUPER_ADMIN_UPDATE_FORBIDDEN', 'Another SUPER_ADMIN may only be reactivated');
            }
            if (target.role === 'SUPER_ADMIN' && target.active &&
                ((data.role !== undefined && data.role !== 'SUPER_ADMIN') || data.active === false) &&
                !admins.some(admin => admin.id !== id && admin.role === 'SUPER_ADMIN' && admin.active)) {
                throw new AdminActionError(409, 'LAST_SUPER_ADMIN', 'Promote another active administrator before leaving');
            }
            await db.execute(
                `UPDATE administrators SET ${fields.join(', ')} WHERE id = ?`,
                [...values, id]
            );
            if ((data.role !== undefined && data.role !== target.role) ||
                (data.active !== undefined && data.active !== Boolean(target.active)) || data.password !== undefined) {
                await db.execute('DELETE FROM refresh_tokens WHERE adminId = ?', [id]);
            }
            await db.commit();
        } catch (error) {
            await db.rollback();
            throw error;
        } finally {
            db.release();
        }
    }

    async delete(id: string, actorId: string, verifiedPasswordHash?: string): Promise<AdminDeleteResult> {
        const db = await this.pool.getConnection();
        try {
            await db.beginTransaction();
            const [admins] = await db.execute<RowDataPacket[]>(lockAdministrators);
            const actor = admins.find(admin => admin.id === actorId);
            const target = admins.find(admin => admin.id === id);
            const isSelf = actorId === id;
            if (!actor?.active || (!isSelf && actor.role !== 'SUPER_ADMIN')) {
                await db.rollback();
                return 'forbidden';
            }
            if (!target) {
                await db.rollback();
                return 'not_found';
            }
            if (target.role === 'SUPER_ADMIN' && !isSelf) {
                await db.rollback();
                return 'super_admin';
            }
            if (isSelf) {
                const [credentials] = await db.execute<RowDataPacket[]>(
                    'SELECT hashPassword FROM administrators WHERE id = ? FOR UPDATE', [id]);
                if (!verifiedPasswordHash || credentials[0]?.hashPassword !== verifiedPasswordHash) {
                    await db.rollback();
                    return 'invalid_password';
                }
            }
            const successor = isSelf
                ? admins.find(admin => admin.id !== id && admin.role === 'SUPER_ADMIN' && admin.active)
                : actor;
            if (isSelf && target.role === 'SUPER_ADMIN' && !successor) {
                await db.rollback();
                return 'last_super_admin';
            }
            if (target.active && !isSelf) {
                await db.rollback();
                return 'active';
            }

            // Keep events and their images: responsibility moves before the account is removed.
            const [events] = await db.execute<RowDataPacket[]>(
                'SELECT id FROM events WHERE administratorId = ? LIMIT 1 FOR UPDATE', [id]);
            if (events.length > 0) {
                if (!successor) {
                    await db.rollback();
                    return 'has_events';
                }
                await db.execute('UPDATE events SET administratorId = ? WHERE administratorId = ?', [successor.id, id]);
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

import { AdminDAO } from "../dao/admin.dao";
import { AdminCreateDTO, AdminSearchByIdDTO, AdminSearchDTO } from "../dto/admin.dto";
import { Admin } from "../model/admin";
import { PasswordCrypto } from './passwordCrypto';
import { AdminUpdateData } from '../dao/admin.dao';
import { AdminActionError } from '../model/adminActionError';

export class AdminService {
    public constructor(private adminDAO: AdminDAO) {}

    public async register(adminCreateDTO: AdminCreateDTO) {
        try {
            if (!adminCreateDTO.name || !adminCreateDTO.email || !adminCreateDTO.password || !adminCreateDTO.role) {
                throw new Error('Missing required fields');
            }

            if (await this.searchByEmail(adminCreateDTO.email)) {
                throw new Error('Email already registered');
            }

            adminCreateDTO.password = await PasswordCrypto.hashPassword(adminCreateDTO.password);
            const admin = Admin.construct(adminCreateDTO);

            await this.adminDAO.register(admin);
        } catch (error: any) {
            throw new Error('Error registering admin: ' + error.message);
        }
    }

    public async delete(id: string, actorId: string, currentPassword?: unknown): Promise<void> {
        let verifiedPasswordHash: string | undefined;
        if (id === actorId) {
            if (typeof currentPassword !== 'string' || !currentPassword) {
                throw new AdminActionError(400, 'CURRENT_PASSWORD_REQUIRED', 'Current password is required');
            }
            const actor = await this.searchById(actorId);
            if (!actor?.active || !actor.password ||
                !await PasswordCrypto.verifyPassword(currentPassword, actor.password)) {
                throw new AdminActionError(403, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
            }
            verifiedPasswordHash = actor.password;
        }
        const result = await this.adminDAO.delete(id, actorId, verifiedPasswordHash);
        switch (result) {
            case 'not_found':
                throw new AdminActionError(404, 'ADMIN_NOT_FOUND', 'Admin not found');
            case 'super_admin':
                throw new AdminActionError(403, 'SUPER_ADMIN_DELETE_FORBIDDEN', 'Cannot delete another SUPER_ADMIN');
            case 'forbidden':
                throw new AdminActionError(403, 'ADMIN_DELETE_FORBIDDEN', 'You cannot delete this administrator');
            case 'invalid_password':
                throw new AdminActionError(403, 'INVALID_CURRENT_PASSWORD', 'Current password has changed; confirm it again');
            case 'last_super_admin':
                throw new AdminActionError(409, 'LAST_SUPER_ADMIN', 'Promote another active administrator before leaving');
            case 'active':
                throw new AdminActionError(409, 'ADMIN_ACTIVE', 'Deactivate the administrator before deleting the account');
            case 'has_events':
                throw new AdminActionError(409, 'ADMIN_HAS_EVENTS', 'No active SUPER_ADMIN is available to take responsibility for linked events');
        }
    }

    public async searchByEmail(email: string): Promise <Admin | null> {
        const admin: Admin | null = await this.adminDAO.searchByEmail(email);
        return admin ? Admin.reconstruct(admin) : null;
    }

    public async searchById(id: string): Promise<Admin | null> {
        const admin = await this.adminDAO.searchById(id);
        return admin ? Admin.reconstruct(admin) : null;
    }

    public async searchPublicById(id: string): Promise<AdminSearchByIdDTO | null> {
        return this.adminDAO.searchPublicById(id);
    }

    public async searchAll(): Promise<AdminSearchDTO[] | null> {
        const admins = await this.adminDAO.searchAll();
        return admins;
    }

    public async update(id: string, data: AdminUpdateData, actorId: string): Promise<void> {
        if (data.email !== undefined) {
            const adminWithEmail = await this.searchByEmail(data.email);
            if (adminWithEmail && adminWithEmail.id !== id) {
                throw new Error('Email already registered');
            }
        }

        if (data.password !== undefined) {
            data.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.adminDAO.update(id, data, actorId);
    }
}

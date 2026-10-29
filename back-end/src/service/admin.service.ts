import { AdminDAO } from "../dao/admin.dao";
import { AdminCreateDTO, AdminSearchByIdDTO, AdminSearchDTO } from "../dto/admin.dto";
import { Admin } from "../model/admin";
import { PasswordCrypto } from './passwordCrypto';
import { AdminUpdateData } from '../dao/admin.dao';

export class AdminDeletionError extends Error {
    constructor(
        public readonly status: 403 | 404 | 409,
        public readonly code: 'ADMIN_NOT_FOUND' | 'SUPER_ADMIN_DELETE_FORBIDDEN' | 'ADMIN_ACTIVE' | 'ADMIN_HAS_EVENTS',
        message: string,
    ) {
        super(message);
        this.name = 'AdminDeletionError';
    }
}

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

    public async delete(id: string): Promise<void> {
        const result = await this.adminDAO.delete(id);
        switch (result) {
            case 'not_found':
                throw new AdminDeletionError(404, 'ADMIN_NOT_FOUND', 'Admin not found');
            case 'super_admin':
                throw new AdminDeletionError(403, 'SUPER_ADMIN_DELETE_FORBIDDEN', 'Cannot delete SUPER_ADMIN');
            case 'active':
                throw new AdminDeletionError(409, 'ADMIN_ACTIVE', 'Deactivate the administrator before deleting the account');
            case 'has_events':
                throw new AdminDeletionError(409, 'ADMIN_HAS_EVENTS', 'Admin has linked events; deactivate the account to preserve event history');
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

    public async update(id: string, data: AdminUpdateData): Promise<void> {
        if (data.email !== undefined) {
            const adminWithEmail = await this.searchByEmail(data.email);
            if (adminWithEmail && adminWithEmail.id !== id) {
                throw new Error('Email already registered');
            }
        }

        if (data.password !== undefined) {
            data.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.adminDAO.update(id, data);
    }
}

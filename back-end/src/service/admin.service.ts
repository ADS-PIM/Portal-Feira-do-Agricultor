import { AdminDAO } from "../dao/admin.dao";
import { AdminCreateDTO, AdminSearchByIdDTO, AdminSearchDTO } from "../dto/admin.dto";
import { Admin } from "../model/admin";
import { PasswordCrypto } from './passwordCrypto';
import { AdminUpdateData } from '../dao/admin.dao';

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
        const admin = await this.searchById(id);
        if (!admin) {
            throw new Error('Admin not found');
        }

        if (admin.role === 'SUPER_ADMIN') {
            throw new Error('Cannot delete SUPER_ADMIN');
        }
        await this.adminDAO.delete(id);
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
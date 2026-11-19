import { AdminDAO } from "../dao/admin.dao";
import { AdminCreateDTO, AdminSearchByIdDTO, AdminSearchDTO } from "../dto/admin.dto";
import { Admin } from "../model/admin";
import { PasswordCrypto } from './passwordCrypto';
import { AdminUpdateData } from '../dao/admin.dao';
import { AdminActionError } from '../model/adminActionError';
import { validateRegistrationEmailDomain } from './registrationEmail';

export class AdminService {
    public constructor(private adminDAO: AdminDAO) {}

    public async register(adminCreateDTO: AdminCreateDTO) {
        if (!adminCreateDTO.name || !adminCreateDTO.email || !adminCreateDTO.password || !adminCreateDTO.role) {
            throw new AdminActionError(400, 'ADMIN_INVALID_DATA', 'Missing required fields');
        }

        if (await this.searchByEmail(adminCreateDTO.email)) {
            throw new AdminActionError(409, 'ADMIN_EMAIL_IN_USE', 'Email already registered');
        }

        await validateRegistrationEmailDomain(adminCreateDTO.email);
        const password = await PasswordCrypto.hashPassword(adminCreateDTO.password);
        const admin = Admin.construct({ ...adminCreateDTO, password });

        await this.adminDAO.register(admin);
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

    public async reactivate(id: string, actorId: string): Promise<void> {
        await this.adminDAO.reactivate(id, actorId);
    }

    public async update(id: string, data: AdminUpdateData, actorId: string): Promise<void> {
        if (data.email !== undefined) {
            const adminWithEmail = await this.searchByEmail(data.email);
            if (adminWithEmail && adminWithEmail.id !== id) {
                throw new AdminActionError(409, 'ADMIN_EMAIL_IN_USE', 'Email already registered');
            }
        }

        if (data.password !== undefined) {
            data.password = await PasswordCrypto.hashPassword(data.password);
        }

        await this.adminDAO.update(id, data, actorId);
    }
}

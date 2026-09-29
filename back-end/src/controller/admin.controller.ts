import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PasswordCrypto } from '../service/passwordCrypto'
import { AdminCreateDTO, AdminLoginDTO, AdminUpdateDTO } from '../dto/admin.dto';
import { AdminService } from '../service/admin.service';
import { RefreshTokenDAO } from '../dao/refreshToken.dao';
import jwt from 'jsonwebtoken';
import { AdminRole } from '../model/admin';
import { AuthRequest } from '../../middleware';

const refreshCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/admin'
};

export class AdminController {
    private adminService: AdminService;

    constructor(adminService: AdminService) {
        this.adminService = adminService;
    }

    public async register(req: Request, res: Response ) {
        try {
            const adminCreateDTO = plainToInstance(AdminCreateDTO, req.body);
            const errors = await validate(adminCreateDTO);

            if (errors.length > 0) {
                return res.status(400).json({errors});
            }

            await this.adminService.register(adminCreateDTO);
            return res.status(201).json({ message: 'Admin registred succesfully' })
        } catch (error: any) {
            return res.status(500).json({error: error.message});
        }
    }

    public async login(req: Request, res: Response) {
        try{
            const adminLoginDTO = plainToInstance(AdminLoginDTO, req.body);
            const errors = await validate(adminLoginDTO);

            if (errors.length > 0) {
                return res.status(400).json({errors});
            }

            const admin = await this.adminService.searchByEmail(adminLoginDTO.email);

            if (!admin  || !admin.password  || !(await PasswordCrypto.verifyPassword(adminLoginDTO.password, admin.password))) {
                return res.status(401).json({error: 'Invalid email or password'});
            }

            const accessSecret = process.env.JWT_ACCESS_SECRET;
            const refreshSecret = process.env.JWT_REFRESH_SECRET;

            if (!accessSecret || !refreshSecret) {
                return res.status(500).json({error: 'JWT secrets are not configured'});
            }

            // Gerar o token de acesso, duração de 5 minutos
            const accessToken = jwt.sign({ adminId: admin.id, role: admin.role }, accessSecret, { expiresIn: '5m' });

            const refreshTokenId = crypto.randomUUID();
            const refreshToken = jwt.sign({ adminId: admin.id, role: admin.role }, refreshSecret, { expiresIn: '7d', jwtid: refreshTokenId });

            const refreshTokenDAO = new RefreshTokenDAO();
            const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            await refreshTokenDAO.create(refreshTokenId, refreshToken, admin.id, refreshExpiresAt);
            res.cookie('refreshToken', refreshToken, refreshCookieOptions);
            res.status(200).json({ accessToken, userId: admin.id });
        }catch (error: any) {
            console.error('Error during login:', error);
            res.status(500).json({ error: error.message || 'Error during login' });
        }
    }

    public async refresh(req: Request, res: Response) {
        try{
            const refreshToken = (req as Request & { cookies?: Record<string, string> }).cookies?.refreshToken;
            if (!refreshToken) return res.status(401).json({ message: 'Refresh token is missing' });

            if (!process.env.JWT_REFRESH_SECRET) {
                throw new Error('JWT refresh secret is not configured');
            }

            const refreshTokenDAO = new RefreshTokenDAO();
            const storedToken = await refreshTokenDAO.findByToken(refreshToken);
            if (!storedToken) return res.status(401).json({ message: 'Invalid refresh token' });

            if (new Date(storedToken.expires_at).getTime() < Date.now()) {
                await refreshTokenDAO.deleteByToken(refreshToken);
                return res.status(401).json({ message: 'Refresh token has expired' });
            }

            let payload: any;
            try {
                payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            } catch (error) {
                await refreshTokenDAO.deleteByToken(refreshToken).catch(() => {});
                return res.status(401).json({ message: 'Invalid or expired refresh token' });
            }

            const adminId = payload.adminId;
            if (!payload.jti || payload.jti !== storedToken.id) {
                return res.status(401).json({ message: 'Invalid refresh token' })
            }

            if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT access secret is not configured');
            const newAccessToken = jwt.sign({ adminId, role: payload.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });

            await refreshTokenDAO.deleteByToken(refreshToken);
            const newRefreshTokenId = crypto.randomUUID();
            const newRefreshToken = jwt.sign({ adminId, role: payload.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d', jwtid: newRefreshTokenId });
            const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await refreshTokenDAO.create(newRefreshTokenId, newRefreshToken, adminId, newRefreshExpiresAt);
        
            res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);
            res.status(200).json({ accessToken: newAccessToken });
        } catch (error: any) {
            console.error('Error during token refresh:', error);
            res.status(500).json({ error: error.message || 'Error during token refresh' });
        }
    }

    public async logout(req: Request, res: Response) {
        try {
            const refreshToken = (req as Request & { cookies?: Record<string, string> }).cookies?.refreshToken;
            if (!refreshToken) return res.status(400).json({ message: 'refreshToken is required' });

            const refreshTokenDAO = new RefreshTokenDAO();
            await refreshTokenDAO.deleteByToken(refreshToken);

            res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: undefined });
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error: any) {
            console.error('Error during logout:', error);
            res.status(500).json({ error: error.message || 'Error during logout' });
        }
    }

    public async update(req: AuthRequest, res: Response) {
        try {
            const authenticatedAdminId = req.admin?.adminId;
            const targetAdminId = req.params.id;

            if (!authenticatedAdminId || typeof targetAdminId !== 'string') {
                return res.status(401).json({ error: 'Invalid authenticated admin' });
            }

            //Verificação interna para não criar duas rotas diferentes, uma para super admin e outra para self update, já que a rota é a mesma, apenas o comportamento muda de acordo com o tipo de usuário.
            const isSelfUpdate = authenticatedAdminId === targetAdminId;
            const isSuperAdmin = req.admin?.role === AdminRole.SUPER_ADMIN;
            const adminUpdateDTO = plainToInstance(AdminUpdateDTO, req.body);
            const errors = await validate(adminUpdateDTO);
            const requestedFields = Object.keys(req.body);

            if (errors.length > 0 || requestedFields.length === 0) {
                return res.status(400).json({ errors });
            }

            const selfAllowedFields = ['name', 'password', 'profile_picture'];
            const superAdminAllowedFields = ['name', 'email', 'role', 'active', 'profile_picture'];
            if (isSelfUpdate && isSuperAdmin) {
                superAdminAllowedFields.push('password');
            }

            const allowedFields = isSuperAdmin ? superAdminAllowedFields : selfAllowedFields;
            const unauthorizedField = requestedFields.find((field) => !allowedFields.includes(field));
            if (unauthorizedField || (!isSelfUpdate && !isSuperAdmin)) {
                return res.status(403).json({
                    error: 'You are not allowed to update the requested admin data'
                });
            }

            const targetAdmin = await this.adminService.searchById(targetAdminId);
            if (!targetAdmin) {
                return res.status(404).json({ error: 'Admin not found' });
            }

            const updateData = Object.fromEntries(
                requestedFields.map((field) => [field, adminUpdateDTO[field as keyof AdminUpdateDTO]])
            );
            await this.adminService.update(targetAdminId, updateData);

            return res.status(200).json({ message: 'Admin updated successfully' });
        } catch (error: any) {
            if (error.message === 'Email already registered') {
                return res.status(409).json({ error: error.message });
            }
            console.error('Error updating admin:', error);
            return res.status(500).json({ error: error.message || 'Error updating admin' });
        }
    }

    public async delete(req: Request, res: Response) {
        try {
            const targetAdminId = req.params.id;
            if (typeof targetAdminId !== 'string') {
                return res.status(400).json({ error: 'Invalid admin id' });
            }
            await this.adminService.delete(targetAdminId);
            return res.status(200).json({ message: 'Admin deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting admin:', error);
            return res.status(500).json({ error: error.message || 'Error deleting admin' });
        }
    }

    public async searchByEmail(email: string) {
        const admin = await this.adminService.searchByEmail(email);
        return admin;
    }

    public async searchAll(req: AuthRequest, res: Response) {
        try {
            const admins = await this.adminService.searchAll()
            return res.status(200).json(admins);
        } catch (error: any) {
            console.error('Error searching admin:', error);
            return res.status(500).json({ error: error.message || 'Error searching admin' });
        }
    }

    public async searchById(req: Request, res: Response) {
        try {
            const adminId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const admin = await this.adminService.searchPublicById(adminId);
            if (!admin) {
                return res.status(404).json({ error: 'Admin not found' });
            }

            return res.status(200).json(admin);
        } catch (error: any) {
            console.error('Error searching admin by id:', error);
            return res.status(500).json({ error: error.message || 'Error searching admin' });
        }
    }
}
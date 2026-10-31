import express, { Router } from "express";
import { ProfilePictureService } from '../service/profilePicture.service';
import { ImageUploadError, MAX_IMAGE_BYTES } from '../service/imageStorage.service';
import { AdminActionError } from '../model/adminActionError';
import type { AuthRequest } from '../../authMiddleware';
import { AdminController } from "../controller/admin.controller";
import { AdminService } from "../service/admin.service";
import { AdminDAO } from "../dao/admin.dao";
import authToken, { isSuperAdmin } from "../../authMiddleware";
import { authenticatedRateLimit, loginRateLimit, passwordRateLimit, passwordRecoveryRateLimit, passwordResetRateLimit, registrationRateLimit, sessionRateLimit } from '../rateLimit/middleware';
import { PasswordResetController } from '../controller/passwordReset.controller';


const adminRoutes = Router();
const adminDAO = new AdminDAO();
const adminService = new AdminService(adminDAO);
const adminController = new AdminController(adminService);
const passwordResetController = new PasswordResetController();
const profilePictures = new ProfilePictureService();
const parseProfileImage = express.raw({ type: ['image/jpeg', 'image/png'], limit: MAX_IMAGE_BYTES });

adminRoutes.post('/me/profile-picture', authToken, authenticatedRateLimit, (req, res, next) => {
    parseProfileImage(req, res, error => {
        if (!error) return next();
        return res.status(error.status === 413 ? 413 : 400).json({ error: 'Não foi possível ler a foto. Use JPG ou PNG de até 4 MB.' });
    });
}, async (req: AuthRequest, res) => {
    const owner = req.admin?.adminId;
    if (!owner) return res.status(401).json({ error: 'Authentication required' });
    try {
        return res.json(await profilePictures.replace(owner, req.body, req.get('content-type')));
    } catch (error) {
        const status = error instanceof ImageUploadError || error instanceof AdminActionError ? error.status : 500;
        return res.status(status).json({ error: 'Não foi possível enviar a nova foto de perfil. A foto anterior foi mantida.' });
    }
});

adminRoutes.delete('/me/profile-picture', authToken, authenticatedRateLimit, async (req: AuthRequest, res) => {
    const owner = req.admin?.adminId;
    if (!owner) return res.status(401).json({ error: 'Authentication required' });
    try {
        return res.json(await profilePictures.clear(owner));
    } catch (error) {
        const status = error instanceof AdminActionError ? error.status : 500;
        return res.status(status).json({ error: 'Não foi possível remover a foto de perfil. Tente novamente.' });
    }
});

adminRoutes.post('/forgot-password', ...passwordRecoveryRateLimit, (req, res) => passwordResetController.request(req, res));
adminRoutes.post('/reset-password', passwordResetRateLimit, (req, res) => passwordResetController.reset(req, res));

adminRoutes
    .route('/')
    .get(authToken, authenticatedRateLimit, async (req, res) => adminController.searchAll(req, res))

adminRoutes
    .route('/register')
    .post(authToken, authenticatedRateLimit, isSuperAdmin, async (req, res) => adminController.register(req,res))

// Rota usada para cadastrar o Root. Mantida desativada por permitir cadastro sem autenticação.
// adminRoutes
//     .route('/register/force')
//     .post(...registrationRateLimit, async (req, res) => adminController.register(req,res))

adminRoutes
    .route('/login')
    .post(...loginRateLimit, async (req, res) => adminController.login(req,res))

adminRoutes
    .route('/logout')
    .post(sessionRateLimit, async (req, res) => adminController.logout(req,res))

adminRoutes
    .route('/refresh')
    .post(sessionRateLimit, async (req, res) => adminController.refresh(req,res))

adminRoutes
    .route('/:id')
    .get(authToken, authenticatedRateLimit, async (req, res) => adminController.searchById(req, res))
    .patch(authToken, authenticatedRateLimit, passwordRateLimit, async (req, res) => adminController.update(req, res))
    .delete(authToken, authenticatedRateLimit, passwordRateLimit, async (req, res) => adminController.delete(req, res))

export default adminRoutes;

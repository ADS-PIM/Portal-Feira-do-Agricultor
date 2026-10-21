import { Router } from "express";
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
    .delete(authToken, authenticatedRateLimit, isSuperAdmin, async (req, res) => adminController.delete(req, res))

export default adminRoutes;

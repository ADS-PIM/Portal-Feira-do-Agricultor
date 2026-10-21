import { Router } from "express";
import { AdminController } from "../controller/admin.controller";
import { AdminService } from "../service/admin.service";
import { AdminDAO } from "../dao/admin.dao";
import authToken, { isSuperAdmin } from "../../authMiddleware";
import { authenticatedRateLimit, loginRateLimit, passwordRateLimit, registrationRateLimit, sessionRateLimit } from '../rateLimit/middleware';


const adminRoutes = Router();
const adminDAO = new AdminDAO();
const adminService = new AdminService(adminDAO);
const adminController = new AdminController(adminService);

adminRoutes
    .route('/')
    .get(authToken, authenticatedRateLimit, async (req, res) => adminController.searchAll(req, res))

adminRoutes
    .route('/register')
    .post(authToken, authenticatedRateLimit, isSuperAdmin, async (req, res) => adminController.register(req,res))

adminRoutes//rota para forcar o registro de um admin, somente para fins de desenvolvimento
    .route('/register/force')
    .post(...registrationRateLimit, async (req, res) => adminController.register(req,res))

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

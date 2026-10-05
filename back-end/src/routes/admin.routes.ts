import { Router } from "express";
import { AdminController } from "../controller/admin.controller";
import { AdminService } from "../service/admin.service";
import { AdminDAO } from "../dao/admin.dao";
import authToken, { isSuperAdmin } from "../../authMiddleware";


const adminRoutes = Router();
const adminDAO = new AdminDAO();
const adminService = new AdminService(adminDAO);
const adminController = new AdminController(adminService);

adminRoutes
    .route('/')
    .get(authToken, async (req, res) => adminController.searchAll(req, res))

adminRoutes
    .route('/register')
    .post(authToken, isSuperAdmin, async (req, res) => adminController.register(req,res))

adminRoutes//rota para forcar o registro de um admin, somente para fins de desenvolvimento
    .route('/register/force')
    .post(async (req, res) => adminController.register(req,res))

adminRoutes
    .route('/login')
    .post(async (req, res) => adminController.login(req,res))

adminRoutes
    .route('/logout')
    .post(async (req, res) => adminController.logout(req,res))

adminRoutes
    .route('/refresh')
    .post(async (req, res) => adminController.refresh(req,res))

adminRoutes
    .route('/:id')
    .get(authToken, async (req, res) => adminController.searchById(req, res))
    .patch(authToken, async (req, res) => adminController.update(req, res))
    .delete(authToken, isSuperAdmin, async (req, res) => adminController.delete(req, res))

export default adminRoutes;
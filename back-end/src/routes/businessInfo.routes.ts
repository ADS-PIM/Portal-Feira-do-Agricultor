import { Router } from "express";
import { BusinessInfoController } from "../controller/businessInfo.controller";
import { BusinessInfoService } from "../service/businessInfo.service";
import { BusinessInfoDAO } from "../dao/businessInfo.dao";
import authToken, { isSuperAdmin } from "../../middleware";

const businessInfoRoutes = Router();
const businessInfoDAO = new BusinessInfoDAO();
const businessInfoService = new BusinessInfoService(businessInfoDAO);
const businessInfoController = new BusinessInfoController(businessInfoService);

businessInfoRoutes
    .route('/')
    .get(async (req, res) => businessInfoController.getInfo(req, res))
    .post(authToken, isSuperAdmin, async (req, res) => businessInfoController.register(req, res))
    .patch(authToken, async(req, res) => businessInfoController.update(req, res))
    .delete(authToken, isSuperAdmin, async (req, res) => businessInfoController.delete(req, res));
    
export default businessInfoRoutes;
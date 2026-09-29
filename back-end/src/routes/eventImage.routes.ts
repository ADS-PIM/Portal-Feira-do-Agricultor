import { Router } from "express";
import { EventImageController } from '../controller/eventImage.controller'
import { EventImageDAO } from "../dao/eventImage.dao";
import { EventImageService } from "../service/eventImage.service";
import authToken from "../../middleware";

const eventImageRoutes = Router();
const eventImageDAO = new EventImageDAO();
const eventImageService = new EventImageService(eventImageDAO)
const eventImageController = new EventImageController(eventImageService)

eventImageRoutes
    .route('/:eventId')
    .get(authToken, async (req, res) => eventImageController.searchByEventId(req, res));

eventImageRoutes
    .route('/create')
    .post(authToken, async (req, res) => eventImageController.create(req, res));

eventImageRoutes
    .route('/:id')
    .patch(authToken, async (req, res) => eventImageController.update(req, res))
    .delete(authToken, async (req, res) => eventImageController.delete(req, res));

export default eventImageRoutes;
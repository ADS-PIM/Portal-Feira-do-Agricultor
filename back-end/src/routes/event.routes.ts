import { Router } from "express";
import { EventController } from "../controller/event.controller";
import { EventService } from "../service/event.service";
import { EventDAO } from "../dao/event.dao";
import authToken from "../../middleware";

const eventRoutes = Router();
const eventDAO = new EventDAO();
const eventService = new EventService(eventDAO);
const eventController = new EventController(eventService);

eventRoutes
    .route('/create')
    .post(authToken, async (req, res) => eventController.create(req, res));

eventRoutes
    .route('/')
    .get(async (req, res) => eventController.searchAll(req, res));

eventRoutes
    .route('/:id')
    .get(async (req, res) => eventController.searchById(req, res))
    .patch(authToken, async (req, res) => eventController.update(req, res))
    .delete(authToken, async (req, res) => eventController.delete(req, res));

export default eventRoutes;
import { Router } from "express";
import { EventController } from "../controller/event.controller";
import { EventService } from "../service/event.service";
import { EventDAO } from "../dao/event.dao";
import authToken from "../../authMiddleware";
import { authenticatedRateLimit, publicReadRateLimit } from '../rateLimit/middleware';
import eventLocationRoutes from './eventLocation.routes';

const eventRoutes = Router();
const eventDAO = new EventDAO();
const eventService = new EventService(eventDAO);
const eventController = new EventController(eventService);

eventRoutes.use('/locations', eventLocationRoutes);

eventRoutes
    .route('/create')
    .post(authToken, authenticatedRateLimit, async (req, res) => eventController.create(req, res));

eventRoutes
    .route('/')
    .get(publicReadRateLimit, async (req, res) => eventController.searchAll(req, res));

eventRoutes
    .route('/nearest')
    .get(publicReadRateLimit, async (req, res) => eventController.searchNearest(req, res));

eventRoutes
    .route('/agenda')
    .get(publicReadRateLimit, async (req, res) => eventController.searchAgenda(req, res));

eventRoutes
    .route('/admin')
    .get(authToken, authenticatedRateLimit, async (req, res) => eventController.searchForAdmin(req, res));

eventRoutes
    .route('/:id')
    .get(publicReadRateLimit, async (req, res) => eventController.searchById(req, res))
    .patch(authToken, authenticatedRateLimit, async (req, res) => eventController.update(req, res))
    .delete(authToken, authenticatedRateLimit, async (req, res) => eventController.delete(req, res));

export default eventRoutes;

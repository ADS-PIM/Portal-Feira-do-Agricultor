import express, { Router } from "express";
import { EventImageController } from '../controller/eventImage.controller'
import { EventImageDAO } from "../dao/eventImage.dao";
import { EventImageService } from "../service/eventImage.service";
import authToken from "../../authMiddleware";
import { authenticatedRateLimit, publicReadRateLimit } from '../rateLimit/middleware';
import { MAX_IMAGE_BYTES } from '../service/imageStorage.service';

const eventImageRoutes = Router();
const eventImageDAO = new EventImageDAO();
const eventImageService = new EventImageService(eventImageDAO)
const eventImageController = new EventImageController(eventImageService)
const parseImageUpload = express.raw({ type: ['image/jpeg', 'image/png'], limit: MAX_IMAGE_BYTES })

eventImageRoutes
    .route('/upload')
    .post(authToken, authenticatedRateLimit, (req, res, next) => {
        parseImageUpload(req, res, error => {
            if (!error) {
                next();
                return;
            }

            const status = 'status' in error && typeof error.status === 'number' ? error.status : 400;
            return res.status(status).json({
                error: status === 413 ? 'A imagem deve ter no máximo 4 MB.' : 'Não foi possível ler o arquivo de imagem.',
            });
        });
    }, async (req, res) => eventImageController.upload(req, res));

eventImageRoutes
    .route('/file')
    .get(publicReadRateLimit, async (req, res) => eventImageController.file(req, res));

eventImageRoutes
    .route('/:eventId')
    .get(publicReadRateLimit, async (req, res) => eventImageController.searchByEventId(req, res));

eventImageRoutes
    .route('/create')
    .post(authToken, authenticatedRateLimit, async (req, res) => eventImageController.create(req, res));

eventImageRoutes
    .route('/:id')
    .patch(authToken, authenticatedRateLimit, async (req, res) => eventImageController.update(req, res))
    .delete(authToken, authenticatedRateLimit, async (req, res) => eventImageController.delete(req, res));

export default eventImageRoutes;

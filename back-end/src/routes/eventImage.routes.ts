import express, { Router } from "express";
import { EventImageController } from '../controller/eventImage.controller'
import { EventImageDAO } from "../dao/eventImage.dao";
import { EventImageService } from "../service/eventImage.service";
import authToken from "../../middleware";

const eventImageRoutes = Router();
const eventImageDAO = new EventImageDAO();
const eventImageService = new EventImageService(eventImageDAO)
const eventImageController = new EventImageController(eventImageService)
const parseImageUpload = express.raw({ type: ['image/jpeg', 'image/png'], limit: '5mb' })

eventImageRoutes
    .route('/upload')
    .post(authToken, (req, res, next) => {
        parseImageUpload(req, res, error => {
            if (!error) {
                next();
                return;
            }

            const status = 'status' in error && typeof error.status === 'number' ? error.status : 400;
            return res.status(status).json({
                error: status === 413 ? 'A imagem deve ter no máximo 5 MB.' : 'Não foi possível ler o arquivo de imagem.',
            });
        });
    }, async (req, res) => eventImageController.upload(req, res));

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
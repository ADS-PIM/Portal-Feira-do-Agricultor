import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { EventImageService } from '../service/eventImage.service'
import { AuthRequest } from '../../authMiddleware'
import { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventImageCreateDTO, EventImageUpdateDTO } from '../dto/eventImage.dto';
import { ImageStorageService, ImageUploadError, isEventImagePathname } from '../service/imageStorage.service';

export class EventImageController {
    public constructor(
        private eventImageService: EventImageService,
        private imageStorage = new ImageStorageService(),
    ) {}

    public async upload(req: AuthRequest, res: Response) {
        try {
            const blob = await this.imageStorage.upload(req.body, req.get('content-type'));
            return res.status(201).json(blob);
        } catch (error) {
            if (error instanceof ImageUploadError) {
                return res.status(error.status).json({ error: error.message });
            }
            console.error('Failed to store event image in Vercel Blob.');
            return res.status(500).json({ error: 'Não foi possível armazenar a imagem. Tente novamente.' });
        }
    }

    public async file(req: AuthRequest, res: Response) {
        const pathname = req.query.pathname;
        if (!isEventImagePathname(pathname)) {
            return res.status(400).json({ error: 'Caminho de imagem inválido.' });
        }

        try {
            const url = this.imageStorage.urlForPathname(pathname);
            // Events and their galleries are public. Only expose files attached to
            // those records, never arbitrary objects from the private store.
            if (!await this.eventImageService.isImageReferenced(url)) {
                return res.status(404).json({ error: 'Imagem não encontrada.' });
            }
            const result = await this.imageStorage.read(pathname, req.get('if-none-match'));
            if (!result) {
                return res.status(404).json({ error: 'Imagem não encontrada.' });
            }
            res.setHeader('Cache-Control', 'private, no-cache');
            res.setHeader('ETag', result.blob.etag);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            if (result.statusCode === 304) {
                return res.status(304).end();
            }
            res.setHeader('Content-Type', result.blob.contentType);
            await pipeline(Readable.fromWeb(result.stream), res);
        } catch {
            console.error('Failed to read event image from Vercel Blob.');
            if (!res.headersSent && !res.destroyed) {
                return res.status(500).json({ error: 'Não foi possível carregar a imagem.' });
            }
            res.destroy();
        }
    }

    public async searchByEventId(req: AuthRequest, res: Response) {
        try {
            const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
            const images = await this.eventImageService.searchByEventId(eventId);
            return res.status(200).json(images);
        } catch (error: any) {
            if (error.message === 'Event not found') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    public async create(req: AuthRequest, res: Response) {
        try{
            const eventImageCreateDTO = plainToInstance(EventImageCreateDTO, req.body)
            const errors = await validate(eventImageCreateDTO);

            if (errors.length > 0) {
                return res.status(400).json({errors});
            }

            await this.eventImageService.create(eventImageCreateDTO);
            return res.status(201).json({ message: 'Image created succesfully' })
        } catch (error: any) {
            if (error.message === 'Event not found') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({  error: error.message })
        }
    }

    public async update(req: AuthRequest, res: Response) {
        try {
            const targetImageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const eventImageUpdateDTO = plainToInstance(EventImageUpdateDTO, req.body);
            const errors = await validate(eventImageUpdateDTO);

            if (errors.length > 0 || (eventImageUpdateDTO.imageURL === undefined && eventImageUpdateDTO.description === undefined)) {
                return res.status(400).json({ errors: errors.length > 0 ? errors : 'Empty parameters' });
            }

            await this.eventImageService.update(targetImageId, eventImageUpdateDTO);
            return res.status(200).json({ message: 'Image updated successfully' });
        } catch (error: any) {
            if (error.message === 'Image not found' || error.message === 'Event not found') {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    public async delete(req: AuthRequest, res: Response) {
        try {
            const targetImageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await this.eventImageService.delete(targetImageId);
            return res.status(200).json({ message: 'Image deleted successfully' });
        } catch (error: any) {
            if (error.message === 'Image not found') {
                return res.status(404).json({ error: 'Image not found' });
            }
            return res.status(500).json({ error: error.message });
        }
    }
}

import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EventImageService } from '../service/eventImage.service'
import { AuthRequest } from '../../middleware'
import { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventImageCreateDTO, EventImageUpdateDTO } from '../dto/eventImage.dto';

export class EventImageController {
    public constructor(private eventImageService: EventImageService) {}

    public async upload(req: AuthRequest, res: Response) {
        const contentType = req.get('content-type');
        const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : null;
        const image = req.body;
        if (!extension || !Buffer.isBuffer(image) || image.length === 0) {
            return res.status(400).json({ error: 'Selecione uma imagem JPG ou PNG.' });
        }

        const hasValidSignature = extension === 'jpg'
            ? image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
            : image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        if (!hasValidSignature) {
            return res.status(400).json({ error: 'O arquivo não corresponde a uma imagem JPG ou PNG válida.' });
        }

        const filename = `${randomUUID()}.${extension}`;
        const uploadDirectory = path.resolve(__dirname, '../../uploads');
        try {
            await mkdir(uploadDirectory, { recursive: true });
            await writeFile(path.join(uploadDirectory, filename), image, { flag: 'wx' });
            const apiOrigin = (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
            return res.status(201).json({ url: `${apiOrigin}/uploads/${filename}` });
        } catch (error) {
            console.error('Failed to store event banner image:', error);
            return res.status(500).json({ error: 'Não foi possível armazenar a imagem. Tente novamente.' });
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
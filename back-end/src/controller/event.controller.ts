import e, { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventCreateDTO, EventUpdateDTO } from '../dto/event.dto';
import { EventService } from '../service/event.service';
import { AuthRequest } from '../../middleware'

export class EventController {
    public constructor(private eventService: EventService) {}

    public async create(req: AuthRequest, res: Response) {
        try {
            const eventCreateDTO = plainToInstance(EventCreateDTO, req.body)
            eventCreateDTO.adminId = req.admin?.adminId as string// não vai dar errado por causa da rota ser protegida
            const errors = await validate(eventCreateDTO);
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            await this.eventService.create(eventCreateDTO)
            return res.status(201).json({  message: 'Event creating successfully' })
        } catch (error: any) {
            return res.status(500).json({  error: error.message })
        }
    }

    public async update(req: AuthRequest, res: Response) {
        try {
            const targetEventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
            const eventUpdateDTO = plainToInstance(EventUpdateDTO, req.body)
            const errors = await validate(eventUpdateDTO)
            if (errors.length > 0) {
                return res.status(400).json({ errors })
            }

            await this.eventService.update(targetEventId, eventUpdateDTO)
            return res.status(201).json({  message: 'Event updated successfully' })
        } catch (error: any) {
            if (error.message.includes === 'Event not found') {
                return res.status(404).json({ error: 'Event not found' });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    public async delete(req: AuthRequest, res: Response) {
        try {
            const targetEventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
            await this.eventService.delete(targetEventId)
            return res.status(200).json({ message: 'Event deleted successfully' })
        } catch (error: any) {
            if (error.message.includes === 'Event not found') {
                return res.status(404).json({ error: 'Event not found' });
            }
            return res.status(500).json({ error: error.message });
        }
    }

    public async searchAll(_req: Request, res: Response) {
        try {
            const events = await this.eventService.searchAll();
            return res.status(200).json(events);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async searchNearest(req: Request, res: Response) {
        const date = req.query.date;
        if (
            typeof date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ||
            new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
        ) {
            return res.status(400).json({ error: 'A valid date query parameter (YYYY-MM-DD) is required' });
        }

        try {
            const event = await this.eventService.searchNearest(date);
            return res.status(200).json(event);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async searchById(req: Request, res: Response) {
        try {
            const eventId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const event = await this.eventService.searchById(eventId);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' })
            }
            return res.status(200).json(event);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
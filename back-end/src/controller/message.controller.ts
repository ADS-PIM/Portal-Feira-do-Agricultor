import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthRequest } from '../../middleware';
import { MessageCreateDTO } from '../dto/message.dto';
import { MessageService } from '../service/message.service';

export class MessageController {
    public constructor(private messageService: MessageService) {}

    public async searchById(req: Request, res: Response) {
        try {
            const messageId = Array.isArray(req.params.id) ? req.params.Id[0] : req.params.id;
            const message = await this.messageService.searchById(messageId);
            if (!message) {
                return res.status(404).json({ error: 'Message not found' });
            }

            return res.status(200).json(message);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async search(req: AuthRequest, res: Response) {
        try {
            const messages = await this.messageService.search();
            return res.status(200).json(messages);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async create(req: AuthRequest, res: Response) {
        try {
            const messageCreateDTO = plainToInstance(MessageCreateDTO, req.body);
            const errors = await validate(messageCreateDTO);
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }

            await this.messageService.create(messageCreateDTO);
            return res.status(201).json({ message: 'Message created successfully' });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    public async delete(req: AuthRequest, res: Response) {
        try {
            const targetMessageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const deleted = await this.messageService.delete(targetMessageId);
            if (!deleted) {
                return res.status(404).json({ error: 'Message not found' });
            }

            return res.status(200).json({ message: 'Message deleted successfully' });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
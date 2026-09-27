import { MessageDAO } from '../dao/message.dao';
import { MessageCreateDTO } from '../dto/message.dto';
import { Message } from '../model/message';

export class MessageService {
    public constructor(private messageDAO: MessageDAO) {}

    public async create(messageCreateDTO: MessageCreateDTO): Promise<void> {
        const message = Message.construct(messageCreateDTO);
        await this.messageDAO.create(message);
    }

    public async delete(id: string): Promise<boolean> {
        return this.messageDAO.delete(id);
    }
}
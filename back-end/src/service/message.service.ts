import { MessageDAO } from '../dao/message.dao';
import { MessageCreateDTO, MessageSearchDTO } from '../dto/message.dto';
import { Message } from '../model/message';

export class MessageService {
    public constructor(private messageDAO: MessageDAO) {}

    public async create(messageCreateDTO: MessageCreateDTO): Promise<void> {
        const message = Message.construct(messageCreateDTO);
        await this.messageDAO.create(message);
    }

    public async search(): Promise<MessageSearchDTO[] | null> {
        const messages = await this.messageDAO.search();
        return messages.length > 0 ? messages : null;
    }

    public async searchById(id: string): Promise<Message | null> {
        const message = await this.messageDAO.searchById(id);
        return message ? Message.reconstruct(message) : null;
    }

    public async delete(id: string): Promise<boolean> {
        return this.messageDAO.delete(id);
    }
}
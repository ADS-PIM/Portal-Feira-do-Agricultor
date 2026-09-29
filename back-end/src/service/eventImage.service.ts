import { EventImageCreateDTO, EventImageSearchByEventId, EventImageUpdateDTO } from '../dto/eventImage.dto';
import { EventImageDAO, EventImageUpdateData } from '../dao/eventImage.dao'
import { EventDAO } from '../dao/event.dao';
import { EventImage } from '../model/eventImage';

export class EventImageService {
    public constructor(private eventImageDAO: EventImageDAO) {}

    public async searchByEventId(eventId: string): Promise<EventImageSearchByEventId[] | null> {
        const eventDAO = new EventDAO()
        if (!await eventDAO.searchById(eventId)) {
            throw new Error('Event not found');
        }
        return this.eventImageDAO.searchByEventId(eventId);
    }

    public async create(eventImageCreateDTO: EventImageCreateDTO): Promise<void> {
        const eventDAO = new EventDAO()
        if (!await eventDAO.searchById(eventImageCreateDTO.eventId)) {
            throw new Error('Event not found');
        }

        try{
            
            const eventImage = EventImage.construct(eventImageCreateDTO);
            await this.eventImageDAO.create(eventImage)
        }catch (error: any) {
            throw new Error('Error creating image: ' + error.message);
        }
    }

    public async update(id: string, eventImageUpdateDTO: EventImageUpdateDTO): Promise<void> {
        if (!await this.eventImageDAO.searchById(id)) {
            throw new Error('Image not found');
        }

        const data: EventImageUpdateData = {
            imageURL: eventImageUpdateDTO.imageURL,
            description: eventImageUpdateDTO.description
        };
        await this.eventImageDAO.update(id, data);
    }

    public async delete(id: string): Promise<void> {
        if (!await this.eventImageDAO.searchById(id)) {
            throw new Error('Image not found');
        }

        await this.eventImageDAO.delete(id);
    }
}
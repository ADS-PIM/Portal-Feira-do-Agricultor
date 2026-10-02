import { EventDAO, EventUpdateData } from '../dao/event.dao';
import { EventCreateDTO, EventNearestSearchDTO, EventSearchByIdDTO, EventSearchDTO, EventUpdateDTO } from '../dto/event.dto';
import { Event } from '../model/event'
import { EventImageDAO } from '../dao/eventImage.dao';

export class EventService {
    public constructor(private eventDAO: EventDAO) {}

    public async create(eventCreateDTO: EventCreateDTO): Promise<void> {
        try {
            if (eventCreateDTO.startAt >= eventCreateDTO.endAt) {
                throw new Error('startAt must be before endAt');
            }

            const event = Event.construct(eventCreateDTO);
            await this.eventDAO.create(event)
        } catch (error: any) {
            throw new Error('Error creating Event: ' + error.message);
        }
    }

    public async update(id: string, eventUpdateDTO: EventUpdateDTO): Promise<void> {
        const event = await this.eventDAO.searchById(id)
        if (!event) {
            throw new Error('Event not Found')
        }

        const startAt = eventUpdateDTO.startAt ?? event.startAt;
        const endAt = eventUpdateDTO.endAt ?? event.endAt;
        if (startAt >= endAt) {
            throw new Error('startAt must be before endAt')
        }

        const data: EventUpdateData = { ...eventUpdateDTO};
        await this.eventDAO.update(id, data)
    }

    public async delete(id: string): Promise<void> {
        const event = await this.eventDAO.searchById(id)
        if (!event) {
            throw new Error('Event not found');
        }

        await this.eventDAO.delete(id)
    }

    public async searchById(id: string): Promise<EventSearchByIdDTO | null> {
        const eventImageDAO = new EventImageDAO()
        const event = await this.eventDAO.searchById(id);
        if (!event) {
            return null;
        }

        const eventImagesList = await eventImageDAO.searchByEventId(id);
        event.eventImages = eventImagesList
        return event;
    }

    public async searchAll(): Promise<EventSearchDTO[] | null> {
        return this.eventDAO.searchAll();
    }

    public async searchNearest(date: string): Promise<EventNearestSearchDTO | null> {
        return this.eventDAO.searchNearest(date);
    }
}
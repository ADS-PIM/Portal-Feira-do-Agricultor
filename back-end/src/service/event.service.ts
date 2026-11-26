import { EventDAO, EventUpdateData } from '../dao/event.dao';
import { AdminEventSearchDTO, EventAgendaScope, EventAgendaSearchDTO, EventCreateDTO, EventNearestSearchDTO, EventSearchByIdDTO, EventSearchDTO, EventUpdateDTO } from '../dto/event.dto';
import { Event } from '../model/event'
import { EventImageDAO } from '../dao/eventImage.dao';
import { ActionError } from '../model/actionError';

export class EventService {
    public constructor(private eventDAO: EventDAO) {}

    public async create(eventCreateDTO: EventCreateDTO): Promise<string> {
        if (eventCreateDTO.startAt >= eventCreateDTO.endAt) {
            throw new ActionError(400, 'INVALID_EVENT_TIME_RANGE', 'startAt must be before endAt');
        }

        const event = Event.construct(eventCreateDTO);
        await this.eventDAO.create(event)
        return event.id;
    }

    public async update(id: string, eventUpdateDTO: EventUpdateDTO): Promise<void> {
        const event = await this.eventDAO.searchById(id)
        if (!event) {
            throw new ActionError(404, 'EVENT_NOT_FOUND', 'Event not found')
        }

        const startAt = eventUpdateDTO.startAt ?? event.startAt;
        const endAt = eventUpdateDTO.endAt ?? event.endAt;
        if (startAt >= endAt) {
            throw new ActionError(400, 'INVALID_EVENT_TIME_RANGE', 'startAt must be before endAt')
        }

        const data: EventUpdateData = { ...eventUpdateDTO};
        await this.eventDAO.update(id, data)
    }

    public async delete(id: string): Promise<void> {
        const event = await this.eventDAO.searchById(id)
        if (!event) {
            throw new ActionError(404, 'EVENT_NOT_FOUND', 'Event not found');
        }

        await this.eventDAO.delete(id)
    }

    public async searchById(id: string, includeImages = true): Promise<EventSearchByIdDTO | null> {
        const event = await this.eventDAO.searchById(id);
        if (event && includeImages) {
            event.eventImages = await new EventImageDAO().searchByEventId(id);
        }
        return event;
    }

    public async searchAll(): Promise<EventSearchDTO[] | null> {
        return this.eventDAO.searchAll();
    }

    public async searchForAdmin(): Promise<AdminEventSearchDTO[]> {
        return this.eventDAO.searchForAdmin();
    }

    public async searchMissingMonthlyFairDates(): Promise<string[]> {
        return this.eventDAO.searchMissingMonthlyFairDates();
    }

    public async recreateMonthlyFair(date: string): Promise<boolean> {
        return this.eventDAO.recreateMonthlyFair(date);
    }

    public async searchNearest(date: string): Promise<EventNearestSearchDTO | null> {
        return this.eventDAO.searchNearest(date);
    }

    public async searchAgenda(date: string, scope: EventAgendaScope = 'upcoming'): Promise<EventAgendaSearchDTO[]> {
        return this.eventDAO.searchAgenda(date, scope);
    }
}

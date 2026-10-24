import { apiFetch } from './api'

export interface NearestEvent {
    id: string
    title: string
    description: string | null
    localAddress: string
    date: string
    startAt: string
    endAt: string
    bannerImage: string | null
}

export interface AgendaEvent {
    id: string
    title: string
    date: string
    startAt: string
    endAt: string
    localAddress: string
    state: 'PENDING' | 'CANCELED' | 'CONCLUDED' | 'RESCHEDULED' | 'HAPPENING'
}

export interface AdminEvent extends AgendaEvent {
    description: string | null
    state: 'PENDING' | 'CANCELED' | 'CONCLUDED' | 'RESCHEDULED' | 'HAPPENING'
    createdAt: string
    bannerImage: string | null
}

export interface AdminEventWithAuthor extends AdminEvent {
    administratorId: string
    administratorName: string
    administratorActive: boolean
}

export interface EventDetails extends Omit<AdminEvent, 'createdAt' | 'localAddress'> {
    localAddress: string | null
    localLatitude: number | string | null
    localLongitude: number | string | null
}

export interface EventImage {
    id: string
    imageURL: string
    description: string
}

export type AdminEventInput = Pick<
    AdminEvent,
    'title' | 'description' | 'date' | 'startAt' | 'endAt' | 'localAddress' | 'state' | 'bannerImage'
>

export function uploadEventBanner(file: File): Promise<{ url: string }> {
    return apiFetch<{ url: string }>('event/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
    })
}

export function getEvents(signal?: AbortSignal): Promise<AdminEvent[] | null> {
    return apiFetch<AdminEvent[] | null>('event', { signal })
}

export function getAdminEvents(signal?: AbortSignal): Promise<AdminEventWithAuthor[]> {
    return apiFetch<AdminEventWithAuthor[]>('event/admin', { signal })
}

export function createAdminEvent(event: AdminEventInput): Promise<{ id: string; message: string }> {
    return apiFetch<{ id: string; message: string }>('event/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    })
}

export function updateAdminEvent(id: string, event: AdminEventInput): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`event/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    })
}

export function deleteAdminEvent(id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`event/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    })
}

export function getNearestEvent(date: string, signal?: AbortSignal): Promise<NearestEvent | null> {
    const query = new URLSearchParams({ date })
    return apiFetch<NearestEvent | null>(`event/nearest?${query}`, { signal })
}

export function getEventAgenda(date: string, signal?: AbortSignal): Promise<AgendaEvent[]> {
    const query = new URLSearchParams({ date })
    return apiFetch<AgendaEvent[]>(`event/agenda?${query}`, { signal })
}

export function getEventDetails(id: string, signal?: AbortSignal): Promise<EventDetails> {
    return apiFetch<EventDetails>(`event/${encodeURIComponent(id)}`, { signal })
}

export function getEventImages(id: string, signal?: AbortSignal): Promise<EventImage[] | null> {
    return apiFetch<EventImage[] | null>(`event/image/${encodeURIComponent(id)}`, { signal })
}

export function createEventImage(eventId: string, imageURL: string, description: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('event/image/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, imageURL, description }),
    })
}

export function deleteEventImage(id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`event/image/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    })
}

import { apiFetch } from './api'
import { ApiRequestError } from './errors'
import { validateEventImage, EVENT_IMAGE_MAX_BYTES } from '../utils/eventImageUpload'

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

type ImageUploadSession = {
    uploadUrl: string
    fields: Record<string, string>
    ticket: string
    expiresAt: number
    uploaded?: boolean
    url?: string
}
const imageUploadSessions = new WeakMap<File, ImageUploadSession>()

export async function uploadEventBanner(file: File): Promise<{ url: string }> {
    if (validateEventImage(file)) throw new ApiRequestError(file.size > EVENT_IMAGE_MAX_BYTES ? 413 : 400, 'event/image/upload')
    let session = imageUploadSessions.get(file)
    if (session?.url) return { url: session.url }
    if (!session || session.expiresAt <= Date.now()) {
        session = await apiFetch<ImageUploadSession>('event/image/upload/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ size: file.size, contentType: file.type }),
        })
        imageUploadSessions.set(file, session)
    }
    if (!session.uploaded) {
        const form = new FormData()
        Object.entries(session.fields).forEach(([key, value]) => form.append(key, value))
        form.append('file', file)
        // Send only the signed Cloudinary fields. Never forward application
        // cookies or the administrator's Bearer token to the storage provider.
        let response: Response
        try {
            response = await fetch(session.uploadUrl, { method: 'POST', body: form, credentials: 'omit' })
        } catch {
            throw new ApiRequestError(502, 'event/image/upload')
        }
        if (!response.ok) throw new ApiRequestError(response.status === 413 ? 413 : 502, 'event/image/upload')
        session.uploaded = true
    }
    // A retry after confirmation fails reuses the upload already completed.
    const result = await apiFetch<{ url: string }>('event/image/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: session.ticket }),
    })
    session.url = result.url
    return result
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

export function getEventAgenda(date: string, signal?: AbortSignal, scope: 'upcoming' | 'month' = 'upcoming'): Promise<AgendaEvent[]> {
    const query = new URLSearchParams({ date, scope })
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

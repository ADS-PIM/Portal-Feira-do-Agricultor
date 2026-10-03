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
}

export function getNearestEvent(date: string, signal?: AbortSignal): Promise<NearestEvent | null> {
    const query = new URLSearchParams({ date })
    return apiFetch<NearestEvent | null>(`event/nearest?${query}`, { signal })
}

export function getEventAgenda(date: string, signal?: AbortSignal): Promise<AgendaEvent[]> {
    const query = new URLSearchParams({ date })
    return apiFetch<AgendaEvent[]>(`event/agenda?${query}`, { signal })
}

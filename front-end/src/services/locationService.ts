import { apiFetch } from './api'
import type { Coordinates } from '../utils/eventLocation'

export type EventLocation = Coordinates & { address: string }
export type SavedEventLocation = EventLocation & { id: number; lastUsedAt: string }

export function searchLocations(query: string, signal?: AbortSignal): Promise<EventLocation[]> {
    return apiFetch(`event/locations/search?${new URLSearchParams({ q: query })}`, { signal })
}

export function getLocationHistory(query = '', signal?: AbortSignal): Promise<SavedEventLocation[]> {
    return apiFetch(`event/locations/history?${new URLSearchParams({ q: query })}`, { signal })
}

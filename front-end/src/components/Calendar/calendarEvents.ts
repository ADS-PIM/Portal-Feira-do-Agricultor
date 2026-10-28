import type { AgendaEvent } from '../../services/eventService'

export const CALENDAR_EVENT_STATES: Array<{ value: AgendaEvent['state']; label: string }> = [
    { value: 'HAPPENING', label: 'Em andamento' },
    { value: 'PENDING', label: 'Agendado' },
    { value: 'RESCHEDULED', label: 'Reagendado' },
    { value: 'CONCLUDED', label: 'Concluído' },
    { value: 'CANCELED', label: 'Cancelado' },
]

export function getCalendarStatusLabel(state: AgendaEvent['state']): string {
    return CALENDAR_EVENT_STATES.find(status => status.value === state)!.label
}

export function compareCalendarEvents(a: AgendaEvent, b: AgendaEvent): number {
    return CALENDAR_EVENT_STATES.findIndex(status => status.value === a.state)
        - CALENDAR_EVENT_STATES.findIndex(status => status.value === b.state)
        || a.date.slice(0, 10).localeCompare(b.date.slice(0, 10))
        || a.startAt.localeCompare(b.startAt)
        || a.id.localeCompare(b.id)
}

import type { AdminEvent } from '../../services/eventService'

export const DASHBOARD_EVENT_STATES = [
    { state: 'PENDING', label: 'Agendados' },
    { state: 'HAPPENING', label: 'Em andamento' },
    { state: 'CONCLUDED', label: 'Concluídos' },
    { state: 'RESCHEDULED', label: 'Reagendados' },
    { state: 'CANCELED', label: 'Cancelados' },
] as const

export function getDashboardMetrics(events: AdminEvent[], now: Date) {
    const endOfPeriod = new Date(now)
    endOfPeriod.setDate(endOfPeriod.getDate() + 30)
    const startsAt = (event: AdminEvent) => new Date(`${event.date.slice(0, 10)}T${event.startAt}`).getTime()
    const upcoming = events.filter(event =>
        ['PENDING', 'RESCHEDULED', 'HAPPENING'].includes(event.state) && startsAt(event) >= now.getTime(),
    ).sort((first, second) => startsAt(first) - startsAt(second) || first.id.localeCompare(second.id))

    return {
        nextEvent: upcoming[0] ?? null,
        upcomingCount: upcoming.length,
        next30Days: upcoming.filter(event => startsAt(event) <= endOfPeriod.getTime()).length,
        missingCover: upcoming.filter(event => !event.bannerImage?.trim()),
        missingDescription: upcoming.filter(event => !event.description?.trim()),
        states: DASHBOARD_EVENT_STATES.map(item => ({
            ...item,
            count: events.filter(event => event.state === item.state).length,
        })),
    }
}

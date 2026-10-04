import type { AgendaEvent } from '../../services/eventService'
import './CalendarEventsPanel.css'

type CalendarEventsPanelProps = {
    events: AgendaEvent[]
    loading: boolean
    error: string | null
    monthLabel: string
    todayEvents: AgendaEvent[]
    todayLoading: boolean
    todayError: string | null
}

function formatEventDate(value: string): { day: string; month: string; weekday: string } {
    const dateKey = value.slice(0, 10)
    const date = new Date(`${dateKey}T12:00:00`)

    return {
        day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
        month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
        weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date),
    }
}

function formatTime(value: string): string {
    return value.slice(0, 5)
}

function CalendarEventCard({ event, isTodayEvent = false }: { event: AgendaEvent; isTodayEvent?: boolean }) {
    const { day, month, weekday } = formatEventDate(event.date)

    return (
        <li className={`calendar-event-card${isTodayEvent ? ' is-today-event' : ''}`} key={event.id}>
            <div className="calendar-event-card-heading">
                <time className="calendar-event-date" dateTime={event.date.slice(0, 10)}>
                    <strong>{day}</strong>
                    <span>{month}</span>
                </time>
                <div className="calendar-event-card-content">
                    <h3>{event.title}</h3>
                    <p className="calendar-event-detail">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                        </svg>
                        <span>{weekday}, {formatTime(event.startAt)} às {formatTime(event.endAt)}</span>
                    </p>
                </div>
            </div>
            <div className="calendar-event-footer">
                <p className="calendar-event-detail calendar-event-location">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                        <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span>{event.localAddress}</span>
                </p>
                <button className="calendar-event-details-button" type="button">
                    <span>Ver detalhes</span>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                </button>
            </div>
        </li>
    )
}

function CalendarEventsPanel({
    events,
    loading,
    error,
    monthLabel,
    todayEvents,
    todayLoading,
    todayError,
}: CalendarEventsPanelProps) {
    const todayEventIds = new Set(todayEvents.map(event => event.id))
    const otherMonthEvents = events.filter(event => !todayEventIds.has(event.id))
    const hasTodayEvents = !todayLoading && todayEvents.length > 0

    return (
        <aside className="calendar-events-panel" aria-labelledby="calendar-events-title">
            {todayError && <p className="calendar-events-panel-message is-error" role="alert">Erro ao carregar os eventos de hoje: {todayError}</p>}
            {todayLoading && <p className="calendar-events-panel-message" role="status">Verificando eventos de hoje...</p>}
            {hasTodayEvents && (
                <section className="calendar-events-today" aria-labelledby="calendar-events-today-title">
                    <h2 id="calendar-events-today-title">Acontecendo hoje</h2>
                    <ul className="calendar-events-list">
                        {todayEvents.map(event => <CalendarEventCard event={event} isTodayEvent key={event.id} />)}
                    </ul>
                </section>
            )}

            <header className="calendar-events-panel-header">
                <h2 id="calendar-events-title">Eventos do mês</h2>
                <p>{monthLabel}</p>
            </header>

            {loading && <p className="calendar-events-panel-message" role="status">Carregando eventos...</p>}
            {error && <p className="calendar-events-panel-message is-error" role="alert">Erro ao carregar os eventos: {error}</p>}
            {!loading && !error && !todayError && otherMonthEvents.length === 0 && todayEvents.length === 0 && !todayLoading && (
                <p className="calendar-events-panel-message">Não há eventos programados para este mês.</p>
            )}
            {!loading && !error && otherMonthEvents.length > 0 && (
                <ul className="calendar-events-list">
                    {otherMonthEvents.map(event => <CalendarEventCard event={event} key={event.id} />)}
                </ul>
            )}
        </aside>
    )
}

export default CalendarEventsPanel

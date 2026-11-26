import type { AgendaEvent } from '../../services/eventService'
import Icon from '../Icon'
import { getCalendarStatusLabel } from './calendarEvents'
import './CalendarEventsPanel.css'

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })

function CalendarEventRow({ event }: { event: AgendaEvent }) {
    const date = event.date.slice(0, 10)
    const weekday = weekdayFormat.format(new Date(`${date}T12:00:00`))
    const detailsUrl = `/evento/${encodeURIComponent(event.id)}`

    return (
        <li className={`calendar-event-row calendar-status--${event.state}`}>
            <time className="calendar-event-date" dateTime={date}>
                <strong>{date.slice(8, 10)}</strong>
                <span>{weekday.split('-')[0]}</span>
            </time>
            <div className="calendar-event-content">
                <h3><a href={detailsUrl}>{event.title}</a></h3>
                <p className="calendar-event-detail">
                    <Icon name="clock" />
                    {event.startAt.slice(0, 5)} às {event.endAt.slice(0, 5)}
                </p>
                {event.localAddress && (
                    <p className="calendar-event-detail">
                        <Icon name="location" />
                        {event.localAddress}
                    </p>
                )}
            </div>
            <div className="calendar-event-actions">
                <span className="calendar-event-status">{getCalendarStatusLabel(event.state)}</span>
                <a className="calendar-event-details" href={detailsUrl} aria-label={`Ver detalhes de ${event.title}`}>
                    Ver detalhes <Icon name="arrowRight" />
                </a>
            </div>
        </li>
    )
}

type CalendarEventsPanelProps = {
    events: AgendaEvent[]
    loading: boolean
    error: string | null
    filtered: boolean
}

function CalendarEventsPanel({ events, loading, error, filtered }: CalendarEventsPanelProps) {
    if (loading) return <p className="calendar-message" role="status">Carregando eventos...</p>
    if (error) return <p className="calendar-message is-error" role="alert">{error}</p>
    if (events.length === 0) {
        return (
            <p className="calendar-message" role="status">
                {filtered ? 'Nenhum evento corresponde à busca e aos filtros selecionados.' : 'Nenhum evento marcado para este ano.'}
            </p>
        )
    }

    const byMonth = MONTHS.map((): AgendaEvent[] => [])
    for (const event of events) {
        byMonth[Number(event.date.slice(5, 7)) - 1].push(event)
    }

    return (
        <>
            <p className="calendar-event-count" role="status">
                {events.length} {events.length === 1 ? 'evento' : 'eventos'} {filtered ? (events.length === 1 ? 'encontrado' : 'encontrados') : 'neste ano'}
            </p>
            <div className="calendar-months">
                {byMonth.map((monthEvents, index) => {
                    if (monthEvents.length === 0) return null
                    const month = MONTHS[index]
                    return (
                        <section className="calendar-month" key={month} aria-labelledby={`calendar-month-${index}`}>
                            <h2 id={`calendar-month-${index}`}>{month}</h2>
                            <ul className="calendar-events-list">
                                {monthEvents.map(event => <CalendarEventRow key={event.id} event={event} />)}
                            </ul>
                        </section>
                    )
                })}
            </div>
        </>
    )
}

export default CalendarEventsPanel

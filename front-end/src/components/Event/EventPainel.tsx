import { useEffect, useState } from 'react'
import Icon from '../Icon'
import EventLoading from './EventLoading'
import NearestEventPainel from './NearestEventPainel'
import { getEventAgenda, getNearestEvent, type AgendaEvent, type NearestEvent } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import { getBusinessInfo } from '../../services/businessInfoService'
import { defaultUpcomingEventsDescription } from '../../utils/businessDescription'
import './EventPainel.css'

const VISIBLE_EVENT_COUNT = 6

const getDateParts = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-')
    return { day, month, year }
}

const formatMonth = (value: string) => {
    const { year, month } = getDateParts(value)
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
        .format(date)
        .replace('.', '')
        .toUpperCase()
}

const formatTime = (value: string) => {
    const [hours, minutes] = value.slice(0, 5).split(':')
    return `${hours}:${minutes}h`
}

const AgendaEventCard = ({ event }: { event: AgendaEvent }) => {
    const { day } = getDateParts(event.date)

    return (
        <a className='event-agenda-card' href={`/evento/${encodeURIComponent(event.id)}`}>
            <time className='event-agenda-date' dateTime={event.date.slice(0, 10)}>
                <strong>{day}</strong>
                <span>{formatMonth(event.date)}</span>
            </time>
            <div className='event-agenda-card-content'>
                <h3>{event.title}</h3>
                <p className='event-agenda-detail'>
                    <Icon name="clock" />
                    <span>{formatTime(event.startAt)} às {formatTime(event.endAt)}</span>
                </p>
                <p className='event-agenda-detail'>
                    <Icon name="location" />
                    <span>{event.localAddress}</span>
                </p>
            </div>
        </a>
    )
}

const EventPainel = () => {
    const [description, setDescription] = useState(defaultUpcomingEventsDescription)

    useEffect(() => {
        const controller = new AbortController()
        void getBusinessInfo(controller.signal)
            .then((info) => {
                if (!controller.signal.aborted) {
                    setDescription(info?.description?.trim() || defaultUpcomingEventsDescription)
                }
            })
            .catch(() => {
                // Keep the default introduction when public information is unavailable.
            })
        return () => controller.abort()
    }, [])

    const [nearestEvent, setNearestEvent] = useState<NearestEvent | null>(null)
    const [nearestLoading, setNearestLoading] = useState(true)
    const [nearestError, setNearestError] = useState<string | null>(null)
    const [events, setEvents] = useState<AgendaEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        const controller = new AbortController()
        const now = new Date()
        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('-')

        const loadAgenda = async () => {
            try {
                const agenda = await getEventAgenda(today, controller.signal)
                if (!controller.signal.aborted) setEvents(agenda)
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setError(getUserFacingError(requestError, 'Não foi possível carregar a agenda de eventos. Tente novamente mais tarde.'))
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        const loadNearestEvent = async () => {
            try {
                const event = await getNearestEvent(today, controller.signal)
                if (!controller.signal.aborted) setNearestEvent(event)
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setNearestError(getUserFacingError(requestError, 'Não foi possível carregar o próximo evento. Tente novamente mais tarde.'))
                }
            } finally {
                if (!controller.signal.aborted) setNearestLoading(false)
            }
        }

        void loadNearestEvent()
        void loadAgenda()
        return () => controller.abort()
    }, [])

    const visibleEvents = events.slice(0, VISIBLE_EVENT_COUNT)

    return (
        <section className="event-agenda" id="agenda" aria-labelledby="upcoming-events-title">
            <div className="event-agenda-shell">
                <header className="event-agenda-header">
                    <h2 id="upcoming-events-title">Próximos eventos</h2>
                    <p className="event-agenda-eyebrow">VENHA NOS VISITAR</p>
                    <p className="event-agenda-intro">
                        {description}
                    </p>
                </header>

                <div className="upcoming-events-layout">
                    <div className="upcoming-events-feature">
                        {nearestLoading && <EventLoading message="Carregando próximo evento..." />}
                        {nearestError && <p className="event-agenda-message is-error" role="alert">{nearestError}</p>}
                        {!nearestLoading && !nearestError && <NearestEventPainel event={nearestEvent} />}
                    </div>

                    <div className="upcoming-events-agenda">
                        {loading && <EventLoading message="Carregando agenda de eventos..." />}
                        {error && <p className="event-agenda-message is-error" role="alert">{error}</p>}
                        {!loading && !error && events.length === 0 && (
                            <p className="event-agenda-message" role="status">Ainda não há eventos futuros programados. Volte em breve para conferir as novidades.</p>
                        )}
                        {!loading && !error && events.length > 0 && (
                            <div className="event-agenda-list" role="region" aria-label="Agenda de próximos eventos" tabIndex={0}>
                                {visibleEvents.map(event => <AgendaEventCard key={event.id} event={event} />)}
                            </div>
                        )}
                        <a className="event-agenda-calendar-button" href="/calendario">
                            Ver Calendário Completo
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default EventPainel

import { useEffect, useState } from 'react'
import { getEventAgenda, type AgendaEvent } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
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
        <article className='event-agenda-card'>
            <time className='event-agenda-date' dateTime={event.date.slice(0, 10)}>
                <strong>{day}</strong>
                <span>{formatMonth(event.date)}</span>
            </time>
            <div className='event-agenda-card-content'>
                <h3>{event.title}</h3>
                <p className='event-agenda-detail'>
                    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                        <circle cx='12' cy='12' r='9' />
                        <path d='M12 7v5l3 2' />
                    </svg>
                    <span>{formatTime(event.startAt)} às {formatTime(event.endAt)}</span>
                </p>
                <p className='event-agenda-detail'>
                    <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                        <path d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z' />
                        <circle cx='12' cy='10' r='2.5' />
                    </svg>
                    <span>{event.localAddress}</span>
                </p>
            </div>
        </article>
    )
}

const EventPainel = () => {
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
                setEvents(await getEventAgenda(today, controller.signal))
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

        void loadAgenda()
        return () => controller.abort()
    }, [])

    const visibleEvents = events.slice(0, VISIBLE_EVENT_COUNT)
    const eventCountClass = visibleEvents.length < 3
        ? `event-agenda-list--${visibleEvents.length}`
        : 'event-agenda-list--three'

    return (
        <section className='event-agenda' id='agenda'>
            <header className='event-agenda-header'>
                <h2>Agenda de Eventos</h2>
                <p className='event-agenda-eyebrow'>FIQUE POR DENTRO</p>
                <p className='event-agenda-intro'>
                    A nossa feira é também um polo de cultura e aprendizado. Participe de oficinas, festivais e feiras sazonais especiais.
                </p>
            </header>

            {loading && <p className='event-agenda-message' role='status'>Carregando agenda de eventos...</p>}
            {error && <p className='event-agenda-message is-error' role='alert'>Erro ao carregar a agenda: {error}</p>}
            {!loading && !error && events.length === 0 && (
                <p className='event-agenda-message' role='status'>Ainda não há eventos futuros programados. Volte em breve para conferir as novidades.</p>
            )}
            {!loading && !error && events.length > 0 && (
                <>
                    <div className={`event-agenda-list ${eventCountClass}`}>
                        {visibleEvents.map(event => <AgendaEventCard key={event.id} event={event} />)}
                    </div>
                    <button className='event-agenda-calendar-button' type='button'>
                        Ver Calendário Completo
                    </button>
                </>
            )}
        </section>
    )
}

export default EventPainel
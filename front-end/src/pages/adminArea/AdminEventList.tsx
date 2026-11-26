import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Icon from '../../components/Icon'
import type { AdminEventWithAuthor as AdminEvent } from '../../services/eventService'
import { formatEventDate, groupAdminEvents, MONTH_OPTIONS } from './adminEventAgenda'
import { STATE_LABELS } from './eventFormLabels'

type AdminEventListProps = {
    events: AdminEvent[]
    limit: number
    offset?: number
    onShowMore?: () => void
    onEdit: (event: AdminEvent) => void
    onDelete: (event: AdminEvent) => void
}

export default function AdminEventList({ events, limit, offset = 0, onShowMore, onEdit, onDelete }: AdminEventListProps) {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000)
        return () => window.clearInterval(timer)
    }, [])
    const visibleYears = useMemo(() => groupAdminEvents(events, now, limit, offset), [events, now, limit, offset])

    const renderEventCard = (event: AdminEvent) => (
        <li className="admin-event-card" key={event.id}>
            <div className="admin-event-title-row">
                <h5 className="admin-event-card-title">{event.title}</h5>
                <span className={`admin-event-status calendar-status--${event.state}`}>{STATE_LABELS[event.state]}</span>
            </div>
            {event.description && <p className="admin-event-description">{event.description}</p>}
            <p className="admin-event-detail">
                <Icon name="calendar" />
                <span>{formatEventDate(event.date)}</span>
            </p>
            <p className="admin-event-detail">
                <Icon name="clock" />
                <span>{event.startAt.slice(0, 5)} - {event.endAt.slice(0, 5)}</span>
            </p>
            <p className="admin-event-detail">
                <Icon name="location" />
                <span>{event.localAddress}</span>
            </p>
            <p className="admin-event-detail">
                <Icon name="user" />
                <span>Cadastrado por: {event.administratorName}</span>
            </p>
            <div className="admin-event-actions">
                <a
                    className="admin-event-action is-view"
                    href={`/evento/${encodeURIComponent(event.id)}`}
                    aria-label={`Ver evento ${event.title}`}
                    title="Ver evento"
                >
                    <Icon name="eye" />
                    <span className="admin-event-action-label">Ver Evento</span>
                </a>
                <button
                    type="button"
                    className="admin-event-action is-edit"
                    aria-label={`Editar evento ${event.title}`}
                    title="Editar evento"
                    onClick={() => onEdit(event)}
                >
                    <Icon name="edit" />
                    <span className="admin-event-action-label">Editar</span>
                </button>
                <button
                    type="button"
                    className="admin-event-action is-delete"
                    aria-label={`Excluir evento ${event.title}`}
                    title="Excluir evento"
                    onClick={() => onDelete(event)}
                >
                    <Icon name="trash" />
                    <span className="admin-event-action-label">Excluir</span>
                </button>
            </div>
        </li>
    )

    return (
        <>
            <div className="admin-events-years" id="admin-events-list">
                {visibleYears.map(({ year, past, months }) => (
                    <section className="admin-events-year" key={`${year}-${past}`}>
                        <h3 className="admin-events-year-heading">
                            {year}
                            {past && <span>Meses anteriores</span>}
                        </h3>
                        {months.map(month => (
                            <section
                                className="admin-events-month"
                                key={month.key}
                                style={{ '--event-count': month.events.length } as CSSProperties}
                            >
                                <h4><time dateTime={month.key}>{MONTH_OPTIONS[Number(month.key.slice(5)) - 1].label}</time></h4>
                                <ul className="admin-events-list">{month.events.map(renderEventCard)}</ul>
                            </section>
                        ))}
                    </section>
                ))}
            </div>
            {onShowMore && limit < events.length && (
                <div className="admin-events-pagination">
                    <button
                        className="admin-event-button is-secondary"
                        type="button"
                        aria-controls="admin-events-list"
                        onClick={onShowMore}
                    >
                        Ver mais
                    </button>
                </div>
            )}
        </>
    )
}

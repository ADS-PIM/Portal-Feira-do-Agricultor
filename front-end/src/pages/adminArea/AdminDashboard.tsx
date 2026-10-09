import { useEffect, useMemo, useState } from 'react'
import type { AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import { getAdmins, type AdminRecord } from '../../services/adminService'
import { getAdminEvents, type AdminEvent } from '../../services/eventService'
import { getUserMessages, type UserMessage } from '../../services/messageService'
import './AdminEvents.css'
import './AdminDashboard.css'
import Icon from '../../components/Icon'
import AdminDashboardOverview, { type DashboardFailures } from './AdminDashboardOverview'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const normalizeDateOnly = (value: string | Date) => {
    if (value instanceof Date) {
        const year = value.getFullYear()
        const month = String(value.getMonth() + 1).padStart(2, '0')
        const day = String(value.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    return String(value).slice(0, 10)
}

const formatDateKey = (value: string | Date) => {
    const date = new Date(`${normalizeDateOnly(value)}T12:00:00`)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const formatEventDate = (value: string | Date) =>
    new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${normalizeDateOnly(value)}T12:00:00`))

const AdminDashboard = ({
    onSelectSection,
    onCreateEventAtDate,
    onEditEvent,
    onDeleteEvent,
}: {
    onSelectSection: (section: AdminSection) => void
    onCreateEventAtDate: (date: string | null) => void
    onEditEvent: (eventId: string) => void
    onDeleteEvent: (eventId: string) => void
}) => {
    const [admins, setAdmins] = useState<AdminRecord[]>([])
    const [messages, setMessages] = useState<UserMessage[]>([])
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [failures, setFailures] = useState<DashboardFailures>({ admins: false, events: false, messages: false })
    const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, '0')}`

    useEffect(() => {
        let active = true

        const loadDashboard = async () => {
            try {
                const [admins, eventList, messages] = await Promise.allSettled([
                    getAdmins(),
                    getAdminEvents(),
                    getUserMessages(),
                ])

                if (!active) return

                setAdmins(admins.status === 'fulfilled' ? admins.value : [])
                setMessages(messages.status === 'fulfilled' ? messages.value ?? [] : [])
                setEvents(eventList.status === 'fulfilled' ? eventList.value ?? [] : [])
                setFailures({
                    admins: admins.status === 'rejected',
                    events: eventList.status === 'rejected',
                    messages: messages.status === 'rejected',
                })
                if ([admins, eventList, messages].some(result => result.status === 'rejected')) {
                    setError('Alguns dados não puderam ser carregados. Os indicadores afetados estão indisponíveis. Recarregue a página para tentar novamente.')
                }
            } catch (dashboardError) {
                if (!active) return
                setError(dashboardError instanceof Error ? dashboardError.message : 'Não foi possível carregar o painel geral.')
            } finally {
                if (active) setIsLoading(false)
            }
        }

        void loadDashboard()
        return () => {
            active = false
        }
    }, [])

    const eventsByDate = useMemo(() => {
        const grouped = new Map<string, AdminEvent[]>()
        events.forEach(event => {
            const dateKey = formatDateKey(event.date)
            const dateEvents = grouped.get(dateKey) ?? []
            dateEvents.push(event)
            grouped.set(dateKey, dateEvents)
        })
        return grouped
    }, [events])

    const calendarDays = useMemo(() => {
        const firstWeekday = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay()
        const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
        const previousMonthDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0).getDate()

        return Array.from({ length: 42 }, (_, index) => {
            const day = index - firstWeekday + 1
            if (day < 1) return { day: previousMonthDays + day, date: null as string | null, outside: true }
            if (day > daysInMonth) return { day: day - daysInMonth, date: null as string | null, outside: true }
            return { day, date: formatDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)), outside: false }
        })
    }, [visibleMonth])

    const agendaEvents = useMemo(
        () => events
            .filter(event => selectedCalendarDate
                ? formatDateKey(event.date) === selectedCalendarDate
                : formatDateKey(event.date).startsWith(monthKey))
            .sort((first, second) => {
                const firstDate = `${formatDateKey(first.date)}T${first.startAt}`
                const secondDate = `${formatDateKey(second.date)}T${second.startAt}`
                return firstDate.localeCompare(secondDate)
            }),
        [events, monthKey, selectedCalendarDate],
    )

    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(visibleMonth)
        .replace(/^./, character => character.toLocaleUpperCase('pt-BR'))
    const monthLabel = `${monthName} ${visibleMonth.getFullYear()}`
    const availableYears = Array.from({ length: 101 }, (_, index) => visibleMonth.getFullYear() - 50 + index)

    const shiftMonth = (offset: number) => {
        setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
        setSelectedCalendarDate(null)
    }

    return (
        <section className="admin-dashboard-page" aria-label="Painel geral">
            <header className="admin-dashboard-header">
                <h1>Painel Geral</h1>
                <p>Acompanhe eventos, mensagens e acesso administrativo</p>
            </header>

            <div className="admin-dashboard-workspace">

                {error && <p className="admin-dashboard-alert is-error" role="alert">{error}</p>}

                <AdminDashboardOverview
                    admins={admins}
                    events={events}
                    messages={messages}
                    isLoading={isLoading}
                    failures={failures}
                    onSelectSection={onSelectSection}
                    onCreateEvent={() => onCreateEventAtDate(null)}
                    onEditEvent={onEditEvent}
                />

                <div className="admin-events admin-events-columns admin-dashboard-agenda">
                    <section className="admin-events-calendar" aria-labelledby="dashboard-calendar-title">
                        <header className="admin-events-calendar-header">
                            <h2 id="dashboard-calendar-title" className="admin-dashboard-period">
                                <span className="admin-dashboard-period-month">{monthName}</span>
                                <span className="admin-dashboard-period-year">
                                <select
                                    className="admin-events-calendar-year"
                                    aria-label="Selecionar ano do calendário administrativo"
                                    value={visibleMonth.getFullYear()}
                                    onChange={event => {
                                        setVisibleMonth(new Date(Number(event.target.value), visibleMonth.getMonth(), 1))
                                        setSelectedCalendarDate(null)
                                    }}
                                >
                                    {availableYears.map(availableYear => (
                                        <option key={availableYear} value={availableYear}>{availableYear}</option>
                                    ))}
                                </select>
                                    <Icon name="chevronRight" />
                                </span>
                            </h2>
                            <div className="admin-events-month-navigation">
                                <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                                    <Icon name="chevronLeft" />
                                </button>
                                <button type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                                    <Icon name="chevronRight" />
                                </button>
                            </div>
                        </header>
                        <div className="admin-events-calendar-grid" role="grid" aria-label={monthLabel}>
                            {WEEKDAYS.map(day => <span className="admin-events-weekday" role="columnheader" key={day}>{day}</span>)}
                            {calendarDays.map((cell, index) => {
                                if (cell.outside || !cell.date) {
                                    return <span className="admin-events-day is-outside" role="gridcell" key={`outside-${index}`}>{cell.day}</span>
                                }
                                const dateEvents = eventsByDate.get(cell.date) ?? []
                                const hasEvents = dateEvents.length > 0
                                return (
                                    <div className="admin-events-day" role="gridcell" key={cell.date}>
                                        <button
                                            type="button"
                                            className={`admin-events-day-button${hasEvents ? ' has-events' : ''}${selectedCalendarDate === cell.date ? ' is-selected' : ''}`}
                                            aria-pressed={selectedCalendarDate === cell.date}
                                            aria-label={`${cell.day}${hasEvents ? ', contém eventos' : ''}`}
                                            title={hasEvents ? dateEvents.map(event => event.title).join(', ') : undefined}
                                            onClick={() => setSelectedCalendarDate(selectedCalendarDate === cell.date ? null : cell.date)}
                                        >
                                            <span>{cell.day}</span>
                                            {hasEvents && <span className="admin-events-day-indicator" aria-hidden="true" />}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    <section className="admin-events-agenda admin-dashboard-agenda-list" aria-labelledby="dashboard-agenda-title">
                        <header className="admin-dashboard-agenda-header">
                            <h2 id="dashboard-agenda-title">
                                {selectedCalendarDate ? formatEventDate(selectedCalendarDate) : 'Agenda do Mês'}
                            </h2>
                            {selectedCalendarDate && (
                                <button
                                    type="button"
                                    className="admin-events-create admin-dashboard-create-event-button"
                                    onClick={() => onCreateEventAtDate(selectedCalendarDate)}
                                >
                                    <Icon name="plus" />
                                    Criar evento nesta data
                                </button>
                            )}
                        </header>
                        {isLoading ? (
                            <p className="admin-events-empty" role="status">Carregando eventos...</p>
                        ) : failures.events ? (
                            <p className="admin-events-empty" role="status">Não foi possível carregar a agenda.</p>
                        ) : agendaEvents.length ? (
                            <ul className="admin-events-list">
                                {agendaEvents.map(event => (
                                    <li className="admin-event-card" key={event.id}>
                                            <h3>{event.title}</h3>
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
                                        <div className="admin-event-actions">
                                            <a
                                                className="admin-event-action is-view"
                                                href={`#/evento/${encodeURIComponent(event.id)}`}
                                                aria-label={`Ver evento ${event.title}`}
                                            >
                                                <Icon name="eye" />
                                                Ver Evento
                                            </a>
                                            <button
                                                type="button"
                                                className="admin-event-action is-edit"
                                                aria-label={`Editar ${event.title}`}
                                                onClick={() => onEditEvent(event.id)}
                                            >
                                                <Icon name="edit" />
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-event-action is-delete"
                                                aria-label={`Excluir ${event.title}`}
                                                onClick={() => onDeleteEvent(event.id)}
                                            >
                                                <Icon name="trash" />
                                                Excluir
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="admin-events-empty">
                                {selectedCalendarDate
                                    ? 'Nenhum evento marcado para este dia.'
                                    : 'Não há eventos programados para este mês.'}
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </section>
    )
}

export default AdminDashboard

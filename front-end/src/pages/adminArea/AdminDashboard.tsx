import { useEffect, useMemo, useState } from 'react'
import type { AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import { getAdmins, type AdminRecord } from '../../services/adminService'
import { getAdminEvents, type AdminEvent } from '../../services/eventService'
import { getUserMessages, type UserMessage } from '../../services/messageService'
import './AdminDashboard.css'
import Icon from '../../components/Icon'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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

const monthLabel = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(date)

const normalizeText = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const formatTimeLabel = (value: string | null | undefined) => {
    if (!value) return 'Horário não informado'

    const [hours, minutes] = String(value).split(':')
    if (!hours || !minutes) return 'Horário não informado'

    const hourNumber = Number(hours)
    if (Number.isNaN(hourNumber)) return 'Horário não informado'

    const displayHour = hourNumber % 12 === 0 ? 12 : hourNumber % 12
    const period = hourNumber >= 12 ? 'pm' : 'am'

    return `${displayHour}h${String(minutes).padStart(2, '0')} ${period}`
}

const formatEventStateLabel = (state: AdminEvent['state']) => {
    switch (state) {
        case 'PENDING':
            return 'Agendado'
        case 'HAPPENING':
            return 'Em andamento'
        case 'CONCLUDED':
            return 'Concluído'
        case 'CANCELED':
            return 'Cancelado'
        case 'RESCHEDULED':
            return 'Reagendado'
        default:
            return state
    }
}

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
    const [selectedMonth, setSelectedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const adminsCount = admins.filter(admin => admin.active).length
    const primaryAdmin = useMemo(() => admins.find(admin => admin.active) ?? admins[0], [admins])
    const unreadMessagesCount = messages.filter(message => !message.isRead).length
    const readMessagesCount = messages.filter(message => message.isRead).length
    const eventDates = useMemo(
        () => new Set(events.filter(event => event.state !== 'CANCELED').map(event => formatDateKey(event.date))),
        [events],
    )

    useEffect(() => {
        let active = true

        const loadDashboard = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const [admins, eventList, messages] = await Promise.all([
                    getAdmins(),
                    getAdminEvents(),
                    getUserMessages().catch(() => []),
                ])

                if (!active) return

                setAdmins(Array.isArray(admins) ? admins : [])
                setMessages(Array.isArray(messages) ? messages : [])
                setEvents(Array.isArray(eventList) ? eventList : [])
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

    const monthDays = useMemo(() => {
        const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
        const startDay = new Date(firstDayOfMonth)
        startDay.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay())

        const days: Date[] = []
        for (let index = 0; index < 42; index += 1) {
            const current = new Date(startDay)
            current.setDate(startDay.getDate() + index)
            days.push(current)
        }

        return days
    }, [selectedMonth])

    const monthEvents = useMemo(() => {
        return [...events]
            .filter(event => formatDateKey(event.date).startsWith(`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`)
                && event.state !== 'CANCELED')
            .sort((left, right) => {
                const dateOrder = formatDateKey(left.date).localeCompare(formatDateKey(right.date))
                return dateOrder || left.startAt.localeCompare(right.startAt)
            })
    }, [events, selectedMonth])

    const monthEventsCount = monthEvents.length
    const monthPendingEvents = monthEvents.filter(event => event.state === 'PENDING').length

    const pendingEvents = events.filter(event => event.state === 'PENDING').length
    const totalEvents = events.length
    const selectedDateEvents = selectedCalendarDate
        ? events.filter(event => formatDateKey(event.date) === selectedCalendarDate)
        : []

    const moveMonth = (delta: number) => {
        setSelectedMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
    }

    return (
        <section className="admin-dashboard-page" aria-label="Painel geral">
            <header className="admin-dashboard-header">
                <h1>Painel Geral</h1>
                <p>Acompanhe eventos, mensagens e acesso administrativo</p>
            </header>

            <div className="admin-dashboard-workspace">
                <div className="admin-dashboard-actions-row">
                    <button type="button" className="admin-dashboard-primary-button" onClick={() => onCreateEventAtDate(null)}>
                        <Icon name="plus" />
                        Criar Evento
                    </button>
                </div>

                {error && <p className="admin-dashboard-alert is-error" role="alert">{error}</p>}

                <div className="admin-dashboard-summary">
                    <div className="admin-dashboard-stat-card">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Administradores cadastrados</span>
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong className="admin-dashboard-stat-value">
                                <span>{isLoading ? '...' : adminsCount}</span>
                                {adminsCount > 0 && <em>ativos</em>}
                            </strong>
                            <small>
                                {admins.length} no sistema{primaryAdmin ? ` · Responsável: ${primaryAdmin.name}` : ''}
                            </small>
                        </div>
                        <button type="button" className="admin-dashboard-stat-shortcut" onClick={() => onSelectSection('administradores')}>
                            Gerenciar administradores
                        </button>
                    </div>

                    <div className="admin-dashboard-stat-card">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Mensagens não lidas</span>
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong className="admin-dashboard-stat-value">
                                <span>{isLoading ? '...' : unreadMessagesCount}</span>
                            </strong>
                            <small>{messages.length} recebidas · {readMessagesCount} lidas</small>
                        </div>
                        <button type="button" className="admin-dashboard-stat-shortcut" onClick={() => onSelectSection('mensagens')}>
                            Abrir mensagens
                        </button>
                    </div>
                </div>

                <div className="admin-dashboard-summary admin-dashboard-summary-secondary">
                    <div className="admin-dashboard-stat-card is-subtle">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Feiras pendentes</span>
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong>{pendingEvents}</strong>
                            <small>{pendingEvents > 0 ? 'Aguardando revisão' : 'Não há pendências'}</small>
                        </div>
                        <button type="button" className="admin-dashboard-stat-shortcut" onClick={() => onSelectSection('eventos')}>
                            Revisar agenda
                        </button>
                    </div>

                    <div className="admin-dashboard-stat-card is-subtle">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Feiras cadastradas</span>
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong>{totalEvents}</strong>
                            <small>{totalEvents > 0 ? 'Ativas no sistema' : 'Nenhuma feira registrada'}</small>
                        </div>
                        <button type="button" className="admin-dashboard-stat-shortcut" onClick={() => onSelectSection('eventos')}>
                            Ver eventos
                        </button>
                    </div>
                </div>

                <div className="admin-dashboard-calendar-panel">
                    <div className="admin-dashboard-calendar-header">
                        <div className="admin-dashboard-calendar-title-wrap">
                            <h2>{new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(selectedMonth)}</h2>
                            <span className="admin-dashboard-calendar-year">{selectedMonth.getFullYear()}</span>
                        </div>

                        <div className="admin-dashboard-month-nav" aria-label="Navegação do mês">
                            <button type="button" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
                                <Icon name="chevronLeft" />
                            </button>
                            <button type="button" onClick={() => moveMonth(1)} aria-label="Próximo mês">
                                <Icon name="chevronRight" />
                            </button>
                        </div>
                    </div>

                    <p className="admin-dashboard-calendar-summary">
                        {monthEventsCount} eventos neste mês · {monthPendingEvents} pendentes
                    </p>

                    <div className="admin-dashboard-calendar-grid" role="grid" aria-label="Calendário do mês">
                        {WEEK_DAYS.map(day => (
                            <span key={day} className="admin-dashboard-calendar-weekday" role="columnheader">
                                {day}
                            </span>
                        ))}

                        {monthDays.map(day => {
                            const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
                            const dateKey = formatDateKey(day)
                            const hasEvent = eventDates.has(dateKey)

                            const dateEvents = events.filter(event => formatDateKey(event.date) === dateKey)
                            return (
                                <button
                                    type="button"
                                    role="gridcell"
                                    key={dateKey}
                                    className={`admin-dashboard-day-cell${!isCurrentMonth ? ' is-muted' : ''}${hasEvent ? ' is-event' : ''}${selectedCalendarDate === dateKey ? ' is-selected' : ''}`}
                                    aria-pressed={selectedCalendarDate === dateKey}
                                    aria-label={`${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(day)}${dateEvents.length ? `, ${dateEvents.length} evento${dateEvents.length === 1 ? '' : 's'}` : ''}`}
                                    title={dateEvents.map(event => event.title).join(', ') || undefined}
                                    onClick={() => {
                                        setSelectedCalendarDate(dateKey)
                                        if (!isCurrentMonth) setSelectedMonth(new Date(day.getFullYear(), day.getMonth(), 1))
                                    }}
                                >
                                    <span>{day.getDate()}</span>
                                </button>
                            )
                        })}
                    </div>
                    {selectedCalendarDate && (
                        <div className="admin-dashboard-calendar-selection" role="status">
                            <div>
                                <strong>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedCalendarDate}T12:00:00`))}</strong>
                                <span>
                                    {selectedDateEvents.length
                                        ? `${selectedDateEvents.length} evento${selectedDateEvents.length === 1 ? '' : 's'} nesta data`
                                        : 'Nenhum evento cadastrado nesta data'}
                                </span>
                            </div>
                            <button type="button" onClick={() => onCreateEventAtDate(selectedCalendarDate)}>
                                Criar evento nesta data
                            </button>
                        </div>
                    )}
                </div>

                <div className="admin-dashboard-events-panel">
                    <div className="admin-dashboard-section-header">
                        <h2>Eventos do mês</h2>
                        <div className="admin-dashboard-section-actions">
                            <span>{normalizeText(monthLabel(selectedMonth))}</span>
                            <button type="button" onClick={() => onSelectSection('eventos')}>Ver agenda</button>
                        </div>
                    </div>

                    {monthEvents.length === 0 ? (
                        <p className="admin-dashboard-empty-state">Nenhum evento cadastrado neste mês.</p>
                    ) : (
                        <div className="admin-dashboard-event-list">
                            {monthEvents.map(event => {
                                const eventDate = new Date(`${normalizeDateOnly(event.date)}T12:00:00`)
                                const dayNumber = String(eventDate.getDate()).padStart(2, '0')
                                const monthLabelShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                                    .format(eventDate)
                                    .replace('.', '')
                                    .toUpperCase()

                                return (
                                    <div className="admin-dashboard-event-item" key={event.id}>
                                        <div className="admin-dashboard-event-date" aria-label={`Data do evento ${event.title}`}>
                                            <span className="admin-dashboard-event-date-number">{dayNumber}</span>
                                            <small>{monthLabelShort}</small>
                                        </div>

                                        <div className="admin-dashboard-event-info">
                                            <strong>{event.title}</strong>
                                            <div className="admin-dashboard-event-meta">
                                                <span>{formatEventStateLabel(event.state)}</span>
                                                <small>
                                                    {event.startAt && event.endAt
                                                        ? `${formatTimeLabel(event.startAt)} - ${formatTimeLabel(event.endAt)}`
                                                        : 'Horário não informado'}
                                                </small>
                                            </div>
                                            <small>{event.localAddress}</small>
                                            {event.description && <p>{event.description}</p>}
                                            <div className="admin-dashboard-event-actions">
                                                <a
                                                    href={`#/evento/${encodeURIComponent(event.id)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Ver página
                                                </a>
                                                <button type="button" aria-label={`Editar ${event.title}`} onClick={() => onEditEvent(event.id)}>
                                                    Editar
                                                </button>
                                                <button type="button" className="is-danger" aria-label={`Excluir ${event.title}`} onClick={() => onDeleteEvent(event.id)}>
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default AdminDashboard

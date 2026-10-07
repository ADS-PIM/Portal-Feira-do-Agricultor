import { useEffect, useMemo, useState } from 'react'
import type { AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import { apiFetch } from '../../services/api'
import { getAdmins, type AdminRecord } from '../../services/adminService'
import { getAdminEvents, type AdminEvent } from '../../services/eventService'
import './AdminDashboard.css'

type MessageSummary = {
    id: string
}

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

const formatShortDate = (value: string) =>
    new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
    }).format(new Date(`${normalizeDateOnly(value)}T12:00:00`))

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

const AdminDashboard = ({ onSelectSection }: { onSelectSection: (section: AdminSection) => void }) => {
    const [admins, setAdmins] = useState<AdminRecord[]>([])
    const [messagesCount, setMessagesCount] = useState(0)
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [selectedMonth, setSelectedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const adminsCount = admins.filter(admin => admin.active).length
    const primaryAdmin = useMemo(() => admins.find(admin => admin.active) ?? admins[0], [admins])
    const latestAdminDate = useMemo(() => {
        const dates = admins
            .map(admin => admin.createdAt)
            .filter((value): value is string => Boolean(value))
            .map(value => new Date(value))
            .filter(date => !Number.isNaN(date.getTime()))

        if (dates.length === 0) {
            return null
        }

        const latest = dates.reduce((max, current) => (current > max ? current : max), dates[0])
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(latest)
    }, [admins])

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
                    apiFetch<MessageSummary[]>('message').catch(() => []),
                ])

                if (!active) return

                setAdmins(Array.isArray(admins) ? admins : [])
                setMessagesCount(Array.isArray(messages) ? messages.length : 0)
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

    const upcomingEvents = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return [...events]
            .filter(event => {
                const eventDate = new Date(`${normalizeDateOnly(event.date)}T12:00:00`)
                return !Number.isNaN(eventDate.getTime()) && eventDate >= today && event.state !== 'CANCELED'
            })
            .sort((left, right) => {
                const leftDate = new Date(`${normalizeDateOnly(left.date)}T12:00:00`).getTime()
                const rightDate = new Date(`${normalizeDateOnly(right.date)}T12:00:00`).getTime()
                return leftDate - rightDate
            })
            .slice(0, 3)
    }, [events])

    const monthEventsCount = useMemo(
        () =>
            events.filter(event => {
                const eventDate = new Date(`${normalizeDateOnly(event.date)}T12:00:00`)
                return event.state !== 'CANCELED' && !Number.isNaN(eventDate.getTime()) && eventDate.getMonth() === selectedMonth.getMonth() && eventDate.getFullYear() === selectedMonth.getFullYear()
            }).length,
        [events, selectedMonth],
    )

    const pendingEvents = events.filter(event => event.state === 'PENDING').length
    const totalEvents = events.length

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
                    <button type="button" className="admin-dashboard-primary-button" onClick={() => onSelectSection('eventos')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Criar Evento
                    </button>
                </div>

                {error && <p className="admin-dashboard-alert is-error" role="alert">{error}</p>}

                <div className="admin-dashboard-summary">
                    <div className="admin-dashboard-stat-card">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Administradores cadastrados</span>
                            {latestAdminDate && (
                                <span className="admin-dashboard-stat-pill">Último cadastro: {latestAdminDate}</span>
                            )}
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong className="admin-dashboard-stat-value">
                                <span>{isLoading ? '...' : adminsCount}</span>
                                {adminsCount > 0 && <em>ativos</em>}
                            </strong>
                            <small>
                                {primaryAdmin ? `${primaryAdmin.name}` : 'Nenhum administrador ativo'}
                                {primaryAdmin?.role ? ` · ${primaryAdmin.role === 'SUPER_ADMIN' ? 'Gestor de Campo' : 'Administrador'}` : ''}
                            </small>
                        </div>
                    </div>

                    <div className="admin-dashboard-stat-card">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Mensagens não lidas</span>
                            {messagesCount > 0 && <span className="admin-dashboard-stat-action">A confirmar</span>}
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong className="admin-dashboard-stat-value">
                                <span>{isLoading ? '...' : messagesCount}</span>
                            </strong>
                            <small>Dados não disponíveis para atualização em tempo real.</small>
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-summary admin-dashboard-summary-secondary">
                    <div className="admin-dashboard-stat-card is-subtle">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Feiras pendentes</span>
                            {pendingEvents > 0 && <span className="admin-dashboard-stat-action is-warning">A confirmar</span>}
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong>{pendingEvents}</strong>
                            <small>{pendingEvents > 0 ? 'Aguardando revisão' : 'Não há pendências'}</small>
                        </div>
                    </div>

                    <div className="admin-dashboard-stat-card is-subtle">
                        <div className="admin-dashboard-stat-card-header">
                            <span className="admin-dashboard-stat-label">Feiras cadastradas</span>
                            {totalEvents > 0 && <span className="admin-dashboard-stat-meta">Menor ênfase</span>}
                        </div>
                        <div className="admin-dashboard-stat-body">
                            <strong>{totalEvents}</strong>
                            <small>{totalEvents > 0 ? 'Ativas no sistema' : 'Nenhuma feira registrada'}</small>
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-calendar-panel">
                    <div className="admin-dashboard-calendar-header">
                        <div className="admin-dashboard-calendar-title-wrap">
                            <h2>{new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(selectedMonth)}</h2>
                            <span className="admin-dashboard-calendar-year">{selectedMonth.getFullYear()}</span>
                            <button type="button" className="admin-dashboard-calendar-toggle" aria-label="Abrir seleção de mês">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7 10l5 5 5-5" />
                                </svg>
                            </button>
                        </div>

                        <div className="admin-dashboard-month-nav" aria-label="Navegação do mês">
                            <button type="button" onClick={() => moveMonth(-1)} aria-label="Mês anterior">‹</button>
                            <button type="button" onClick={() => moveMonth(1)} aria-label="Próximo mês">›</button>
                        </div>
                    </div>

                    <p className="admin-dashboard-calendar-summary">{monthEventsCount} eventos neste mês</p>

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

                            return (
                                <div
                                    key={dateKey}
                                    className={`admin-dashboard-day-cell${!isCurrentMonth ? ' is-muted' : ''}${hasEvent ? ' is-event' : ''}`}
                                >
                                    <span>{day.getDate()}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="admin-dashboard-events-panel">
                    <div className="admin-dashboard-section-header">
                        <h2>Eventos Próximos</h2>
                        <span>{normalizeText(monthLabel(selectedMonth))}</span>
                    </div>

                    {upcomingEvents.length === 0 ? (
                        <p className="admin-dashboard-empty-state">Nenhum evento programado para os próximos dias.</p>
                    ) : (
                        <div className="admin-dashboard-event-list">
                            {upcomingEvents.map(event => {
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
                                                <small>{event.startAt ? formatTimeLabel(event.startAt) : formatShortDate(event.date)}</small>
                                            </div>
                                            <small>{event.localAddress}</small>
                                        </div>

                                        <span className={`admin-dashboard-event-badge ${event.state === 'PENDING' ? 'is-pending' : 'is-confirmed'}`}>
                                            {event.state === 'PENDING' ? 'Confirmado' : 'Em breve'}
                                        </span>
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

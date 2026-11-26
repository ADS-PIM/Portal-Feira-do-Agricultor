import { useMemo, useState } from 'react'
import type { AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import { getAdminCounts } from '../../services/adminService'
import { getAdminEvents, type AdminEventWithAuthor as AdminEvent } from '../../services/eventService'
import { getMessageCounts } from '../../services/messageService'
import { getCalendarYears, MIN_FILTER_YEAR } from '../../utils/calendarYears'
import './AdminEvents.css'
import './AdminDashboard.css'
import CreateEventButton from './CreateEventButton'
import Icon from '../../components/Icon'
import AdminDashboardOverview from './AdminDashboardOverview'
import AdminEventList from './AdminEventList'
import { formatEventDate, getFairDateTime } from './adminEventAgenda'
import { useDashboardData } from './useDashboardData'
import { CALENDAR_EVENT_STATES, getCalendarStatusLabel } from '../../components/Calendar/calendarEvents'
import '../../components/Calendar/CalendarStatus.css'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const EMPTY_EVENTS: AdminEvent[] = []
const DASHBOARD_PAGE_SIZE = 6

function calendarDateKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
}

const AdminDashboard = ({
    onSelectSection,
    onCreateEventAtDate,
    onEditEvent,
    onFilterEvents,
    onDeleteEvent,
}: {
    onSelectSection: (section: AdminSection) => void
    onCreateEventAtDate: (date: string | null) => void
    onEditEvent: (eventId: string) => void
    onFilterEvents: (eventIds: string[], label: string) => void
    onDeleteEvent: (eventId: string) => void
}) => {
    const admins = useDashboardData(getAdminCounts)
    const messages = useDashboardData(getMessageCounts)
    const agenda = useDashboardData(getAdminEvents)
    const events = agenda.data ?? EMPTY_EVENTS
    const [currentMonth] = useState(() => new Date(`${getFairDateTime(new Date()).slice(0, 7)}-01T12:00:00`))
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(null)
    const visibleMonth = selectedMonth ?? currentMonth
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
    const [agendaPage, setAgendaPage] = useState(1)
    const monthFilter = selectedMonth && calendarDateKey(selectedMonth).slice(0, 7)

    const eventsByDate = useMemo(() => {
        const grouped = new Map<string, AdminEvent[]>()
        events.forEach(event => {
            const dateKey = event.date.slice(0, 10)
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
            return { day, date: calendarDateKey(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)), outside: false }
        })
    }, [visibleMonth])

    const agendaEvents = useMemo(() => {
        if (selectedCalendarDate) return eventsByDate.get(selectedCalendarDate) ?? EMPTY_EVENTS
        if (monthFilter) return events.filter(event => event.date.startsWith(monthFilter))
        return events
    }, [events, eventsByDate, monthFilter, selectedCalendarDate])
    const pageCount = Math.max(1, Math.ceil(agendaEvents.length / DASHBOARD_PAGE_SIZE))
    const currentPage = Math.min(agendaPage, pageCount)

    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(visibleMonth)
        .replace(/^./, character => character.toLocaleUpperCase('pt-BR'))
    const monthLabel = `${monthName} ${visibleMonth.getFullYear()}`
    const availableYears = getCalendarYears(visibleMonth.getFullYear())

    const selectMonth = (month: Date | null) => {
        setSelectedMonth(month)
        setSelectedCalendarDate(null)
        setAgendaPage(1)
    }

    const shiftMonth = (offset: number) => {
        selectMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1))
    }

    const renderPagination = (position: 'top' | 'bottom') => {
        if (agenda.status !== 'ready' || pageCount <= 1) return null
        return (
            <nav className="admin-dashboard-pagination" aria-label={position === 'top' ? 'Paginação dos eventos' : 'Paginação dos eventos no fim da lista'}>
                <button
                    type="button"
                    className="admin-event-button is-secondary"
                    aria-label="Página anterior"
                    aria-controls="admin-events-list"
                    disabled={currentPage === 1}
                    onClick={() => setAgendaPage(currentPage - 1)}
                >
                    Anterior
                </button>
                <span role={position === 'top' ? 'status' : undefined}>Página {currentPage} de {pageCount}</span>
                <button
                    type="button"
                    className="admin-event-button is-secondary"
                    aria-label="Próxima página"
                    aria-controls="admin-events-list"
                    disabled={currentPage === pageCount}
                    onClick={() => setAgendaPage(currentPage + 1)}
                >
                    Próxima
                </button>
            </nav>
        )
    }

    return (
        <section className="admin-dashboard-page" aria-label="Painel geral">
            <header className="admin-dashboard-header">
                <h1>Painel Geral</h1>
                <p>Acompanhe eventos, mensagens e acesso administrativo</p>
            </header>

            <div className="admin-dashboard-workspace">

                <AdminDashboardOverview
                    admins={admins}
                    events={events}
                    messages={messages}
                    agendaStatus={agenda.status}
                    retryAgenda={agenda.retry}
                    onSelectSection={onSelectSection}
                    onCreateEvent={() => onCreateEventAtDate(null)}
                    onEditEvent={onEditEvent}
                    onFilterEvents={onFilterEvents}
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
                                    onChange={event => selectMonth(new Date(Number(event.target.value), visibleMonth.getMonth(), 1))}
                                >
                                    {availableYears.map(availableYear => (
                                        <option key={availableYear} value={availableYear}>{availableYear}</option>
                                    ))}
                                </select>
                                    <Icon name="chevronRight" />
                                </span>
                            </h2>
                            <div className="admin-events-month-navigation">
                                <button
                                    type="button"
                                    onClick={() => shiftMonth(-1)}
                                    disabled={visibleMonth.getFullYear() === MIN_FILTER_YEAR && visibleMonth.getMonth() === 0}
                                    aria-label="Mês anterior"
                                >
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
                                const dayStates = CALENDAR_EVENT_STATES.filter(status => dateEvents.some(event => event.state === status.value))
                                return (
                                    <div className="admin-events-day" role="gridcell" key={cell.date}>
                                        <button
                                            type="button"
                                            className={[
                                                'admin-events-day-button',
                                                hasEvents ? 'has-events' : '',
                                                dayStates.length === 1 ? `calendar-status--${dayStates[0].value}` : '',
                                                selectedCalendarDate === cell.date ? 'is-selected' : '',
                                            ].filter(Boolean).join(' ')}
                                            aria-pressed={selectedCalendarDate === cell.date}
                                            aria-label={`${cell.day}${hasEvents ? `, ${dateEvents.length} eventos: ${dayStates.map(status => status.label).join(', ')}` : ''}`}
                                            title={hasEvents ? dateEvents.map(event => `${event.title} (${getCalendarStatusLabel(event.state)})`).join(', ') : undefined}
                                            onClick={() => {
                                                setSelectedCalendarDate(selectedCalendarDate === cell.date ? null : cell.date)
                                                setAgendaPage(1)
                                            }}
                                        >
                                            <span>{cell.day}</span>
                                            {hasEvents && (
                                                <span className="admin-dashboard-day-indicators" aria-hidden="true">
                                                    {dayStates.map(status => (
                                                        <span key={status.value} className={`admin-dashboard-status-dot calendar-status--${status.value}`} />
                                                    ))}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        <ul className="admin-dashboard-status-legend" aria-label="Legenda dos status dos eventos">
                            {CALENDAR_EVENT_STATES.map(status => (
                                <li key={status.value}>
                                    <span className={`admin-dashboard-status-dot calendar-status--${status.value}`} aria-hidden="true" />
                                    {status.label}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="admin-events-agenda admin-events-all-list admin-dashboard-agenda-list" aria-labelledby="dashboard-agenda-title">
                        <header className="admin-dashboard-agenda-header">
                            <h2 id="dashboard-agenda-title">
                                {selectedCalendarDate ? formatEventDate(selectedCalendarDate) : selectedMonth ? 'Agenda do mês' : 'Agenda de eventos'}
                            </h2>
                            {(selectedCalendarDate || selectedMonth) && (
                                <div className="admin-dashboard-agenda-actions">
                                    <button type="button" className="admin-event-action is-view" onClick={() => selectMonth(null)}>
                                        Ver toda a agenda
                                    </button>
                                    {selectedCalendarDate && (
                                        <CreateEventButton
                                            className="admin-dashboard-create-event-button"
                                            label="Criar evento nesta data"
                                            onClick={() => onCreateEventAtDate(selectedCalendarDate)}
                                        />
                                    )}
                                </div>
                            )}
                            {renderPagination('top')}
                        </header>
                        {agenda.status === 'loading' ? (
                            <p className="admin-events-empty" role="status">Carregando eventos...</p>
                        ) : agenda.status === 'error' ? (
                            <p className="admin-events-empty" role="status">Não foi possível carregar a agenda.</p>
                        ) : agendaEvents.length ? (
                            <AdminEventList
                                events={agendaEvents}
                                limit={DASHBOARD_PAGE_SIZE}
                                offset={(currentPage - 1) * DASHBOARD_PAGE_SIZE}
                                onEdit={event => onEditEvent(event.id)}
                                onDelete={event => onDeleteEvent(event.id)}
                            />
                        ) : (
                            <p className="admin-events-empty">
                                {selectedCalendarDate
                                    ? 'Nenhum evento marcado para este dia.'
                                    : selectedMonth ? 'Não há eventos programados para este mês.' : 'Nenhum evento cadastrado.'}
                            </p>
                        )}
                        {renderPagination('bottom')}
                    </section>
                </div>
            </div>
        </section>
    )
}

export default AdminDashboard

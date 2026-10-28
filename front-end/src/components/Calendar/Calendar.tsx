import { useEffect, useMemo, useState } from 'react'
import { getEventAgenda, type AgendaEvent } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import Icon from '../Icon'
import CalendarEventsPanel from './CalendarEventsPanel'
import { CALENDAR_EVENT_STATES, compareCalendarEvents, getCalendarStatusLabel } from './calendarEvents'
import './Calendar.css'
import './CalendarStatus.css'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEKDAY_OPTIONS = [
    { value: '', label: 'Todos os dias' },
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda-feira' },
    { value: '2', label: 'Terça-feira' },
    { value: '3', label: 'Quarta-feira' },
    { value: '4', label: 'Quinta-feira' },
    { value: '5', label: 'Sexta-feira' },
    { value: '6', label: 'Sábado' },
]

function getDateKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function formatTime(value: string): string {
    const [hours, minutes] = value.slice(0, 5).split(':')
    return `${hours}:${minutes}`
}

function matchesFilters(
    event: AgendaEvent,
    query: string,
    statusFilter: AgendaEvent['state'] | '',
    weekdayFilter: string,
    timeFromFilter: string,
    timeToFilter: string,
): boolean {
    const matchesSearch = !query || event.title.toLocaleLowerCase('pt-BR').includes(query)
    const matchesStatus = !statusFilter || event.state === statusFilter
    const eventWeekday = new Date(`${event.date.slice(0, 10)}T12:00:00`).getDay().toString()
    const matchesWeekday = !weekdayFilter || eventWeekday === weekdayFilter
    const startsAt = event.startAt.slice(0, 5)
    const endsAt = event.endAt.slice(0, 5)
    const matchesTime = (!timeFromFilter || endsAt >= timeFromFilter)
        && (!timeToFilter || startsAt <= timeToFilter)

    return matchesSearch && matchesStatus && matchesWeekday && matchesTime
}

function Calendar() {
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const today = new Date()
        return new Date(today.getFullYear(), today.getMonth(), 1)
    })
    const [events, setEvents] = useState<AgendaEvent[]>([])
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<AgendaEvent['state'] | ''>('')
    const [weekdayFilter, setWeekdayFilter] = useState('')
    const [timeFromFilter, setTimeFromFilter] = useState('')
    const [timeToFilter, setTimeToFilter] = useState('')

    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

    useEffect(() => {
        const controller = new AbortController()
        const firstDayOfMonth = `${monthKey}-01`

        const loadMonthEvents = async () => {
            setLoading(true)
            setError(null)

            try {
                const agenda = await getEventAgenda(firstDayOfMonth, controller.signal, 'month')
                setEvents(agenda)
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setEvents([])
                    setError(getUserFacingError(requestError, 'Não foi possível carregar os eventos deste mês. Tente novamente mais tarde.'))
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            }
        }

        void loadMonthEvents()
        return () => controller.abort()
    }, [monthKey])

    const query = searchTerm.trim().toLocaleLowerCase('pt-BR')
    const matchingEvents = useMemo(
        () => events
            .filter(event => event.date.slice(0, 7) === monthKey && matchesFilters(event, query, statusFilter, weekdayFilter, timeFromFilter, timeToFilter))
            .sort(compareCalendarEvents),
        [events, monthKey, query, statusFilter, timeFromFilter, timeToFilter, weekdayFilter],
    )

    const eventsByDate = useMemo(() => {
        const grouped = new Map<string, AgendaEvent[]>()
        for (const event of matchingEvents) {
            const dateKey = event.date.slice(0, 10)
            const dayEvents = grouped.get(dateKey) ?? []
            dayEvents.push(event)
            grouped.set(dateKey, dayEvents)
        }
        return grouped
    }, [matchingEvents])

    const calendarEvents = matchingEvents
    const visibleEvents = selectedDate
        ? matchingEvents.filter(event => event.date.slice(0, 10) === selectedDate)
        : calendarEvents

    const calendarDays = useMemo(() => {
        const firstWeekday = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const daysInPreviousMonth = new Date(year, month, 0).getDate()

        return Array.from({ length: 42 }, (_, index) => {
            const dayNumber = index - firstWeekday + 1
            if (dayNumber < 1) {
                return { date: null, day: daysInPreviousMonth + dayNumber, outsideMonth: true }
            }
            if (dayNumber > daysInMonth) {
                return { date: null, day: dayNumber - daysInMonth, outsideMonth: true }
            }
            const date = new Date(year, month, dayNumber)
            return { date, day: dayNumber, outsideMonth: false }
        })
    }, [month, year])

    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(visibleMonth)
        .replace(/^./, character => character.toLocaleUpperCase('pt-BR'))
    const monthLabel = `${monthName} ${year}`
    const availableYears = Array.from({ length: 101 }, (_, index) => year - 50 + index)
    const selectedEvents = selectedDate
        ? eventsByDate.get(selectedDate) ?? []
        : []
    const selectedDateLabel = selectedDate
        ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${selectedDate}T12:00:00`))
        : ''

    const navigateMonth = (offset: number) => {
        setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
        setSelectedDate(null)
    }
    const activeFilterCount = [statusFilter, weekdayFilter, timeFromFilter, timeToFilter].filter(Boolean).length
    const clearFilters = () => {
        setStatusFilter('')
        setWeekdayFilter('')
        setTimeFromFilter('')
        setTimeToFilter('')
    }

    return (
        <div className="calendar-layout">
            <section className="calendar" aria-labelledby="calendar-title">
                <header className="calendar-header">
                    <div className="calendar-heading">
                        <h2 id="calendar-title">
                            <span>{monthName}</span>
                            <select
                                className="calendar-year-select"
                                aria-label="Selecionar ano"
                                value={year}
                                onChange={event => {
                                    setVisibleMonth(new Date(Number(event.target.value), month, 1))
                                    setSelectedDate(null)
                                }}
                            >
                                {availableYears.map(availableYear => (
                                    <option key={availableYear} value={availableYear}>{availableYear}</option>
                                ))}
                            </select>
                        </h2>
                        <p className="calendar-event-count" aria-live="polite">
                            {loading ? 'Carregando eventos...' : `${calendarEvents.length} ${calendarEvents.length === 1 ? 'evento' : 'eventos'} neste mês`}
                        </p>
                    </div>
                    <nav className="calendar-navigation" aria-label="Navegação do calendário">
                        <button
                            type="button"
                            onClick={() => navigateMonth(-1)}
                            aria-label="Mês anterior"
                        >
                            <Icon name="chevronLeft" />
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateMonth(1)}
                            aria-label="Próximo mês"
                        >
                            <Icon name="chevronRight" />
                        </button>
                    </nav>
                </header>

                <div className="calendar-grid" role="grid" aria-label={monthLabel}>
                    {WEEKDAYS.map((weekday, index) => (
                        <span className="calendar-weekday" role="columnheader" key={weekday} aria-label={['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][index]}>
                            {weekday}
                        </span>
                    ))}
                    {calendarDays.map((cell, index) => {
                        if (cell.outsideMonth || !cell.date) {
                            return (
                                <span className="calendar-day calendar-day--outside" role="gridcell" aria-hidden="true" key={`outside-${index}`}>
                                    {cell.day}
                                </span>
                            )
                        }

                        const dateKey = getDateKey(cell.date)
                        const dayEvents = eventsByDate.get(dateKey)?.filter(event => event.date.slice(0, 7) === monthKey) ?? []
                        const hasEvents = dayEvents.length > 0
                        const dayStates = CALENDAR_EVENT_STATES.filter(status => dayEvents.some(event => event.state === status.value))
                        const isToday = dateKey === getDateKey(new Date())
                        const isSelected = dateKey === selectedDate
                        const dayLabel = `${cell.day}${hasEvents ? `, ${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}: ${dayStates.map(status => status.label).join(', ')}` : ''}`

                        return (
                            <div className="calendar-day" role="gridcell" key={dateKey}>
                                <button
                                    type="button"
                                    className={[
                                        'calendar-day-button',
                                        hasEvents ? 'has-events' : '',
                                        dayStates.length === 1 ? `calendar-status--${dayStates[0].value}` : '',
                                        isToday ? 'is-today' : '',
                                        isSelected ? 'is-selected' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setSelectedDate(current => current === dateKey ? null : dateKey)}
                                    aria-label={dayLabel}
                                    aria-pressed={isSelected}
                                    aria-current={isToday ? 'date' : undefined}
                                    title={hasEvents ? dayEvents.map(event => `${event.title} (${getCalendarStatusLabel(event.state)})`).join(', ') : undefined}
                                >
                                    <span>{cell.day}</span>
                                    {hasEvents && (
                                        <span className="calendar-day-indicators" aria-hidden="true">
                                            {dayStates.map(status => <span key={status.value} className={`calendar-day-indicator calendar-status--${status.value}`} />)}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                <ul className="calendar-status-legend" aria-label="Legenda dos status dos eventos">
                    {CALENDAR_EVENT_STATES.map(status => (
                        <li key={status.value}>
                            <span className={`calendar-day-indicator calendar-status--${status.value}`} aria-hidden="true" />
                            {status.label}
                        </li>
                    ))}
                </ul>

                {selectedDate && (
                    <section className="calendar-selected-events" aria-live="polite">
                        <h3>{selectedDateLabel}</h3>
                        {loading ? (
                            <p role="status">Carregando eventos...</p>
                        ) : selectedEvents.length > 0 ? (
                            <ul>
                                {selectedEvents.map(event => (
                                    <li key={event.id}>
                                        <strong>{event.title}</strong>
                                        <span className={`calendar-event-status calendar-status--${event.state}`}>{getCalendarStatusLabel(event.state)}</span>
                                        <span>{formatTime(event.startAt)} às {formatTime(event.endAt)}</span>
                                        <span>{event.localAddress}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Nenhum evento marcado para este dia.</p>
                        )}
                    </section>
                )}
            </section>
            <CalendarEventsPanel
                events={visibleEvents}
                loading={loading}
                error={error}
                monthLabel={monthLabel}
                searchTerm={searchTerm}
                onSearchTermChange={value => {
                    setSearchTerm(value)
                    setSelectedDate(null)
                }}
                isFiltersOpen={isFiltersOpen}
                onToggleFilters={() => setIsFiltersOpen(open => !open)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                weekdayFilter={weekdayFilter}
                onWeekdayFilterChange={setWeekdayFilter}
                timeFromFilter={timeFromFilter}
                onTimeFromFilterChange={setTimeFromFilter}
                timeToFilter={timeToFilter}
                onTimeToFilterChange={setTimeToFilter}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                weekdayOptions={WEEKDAY_OPTIONS}
                statusOptions={CALENDAR_EVENT_STATES}
            />
        </div>
    )
}

export default Calendar

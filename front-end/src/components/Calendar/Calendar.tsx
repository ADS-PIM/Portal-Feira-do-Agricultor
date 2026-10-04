import { useEffect, useMemo, useState } from 'react'
import { getEventAgenda, type AgendaEvent } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import CalendarEventsPanel from './CalendarEventsPanel'
import './Calendar.css'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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

function Calendar() {
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const today = new Date()
        return new Date(today.getFullYear(), today.getMonth(), 1)
    })
    const [events, setEvents] = useState<AgendaEvent[]>([])
    const [todayEvents, setTodayEvents] = useState<AgendaEvent[]>([])
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [todayLoading, setTodayLoading] = useState(true)
    const [todayError, setTodayError] = useState<string | null>(null)

    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const todayDateKey = getDateKey(new Date())

    useEffect(() => {
        const controller = new AbortController()
        const firstDayOfMonth = `${monthKey}-01`

        const loadMonthEvents = async () => {
            setLoading(true)
            setError(null)

            try {
                const agenda = await getEventAgenda(firstDayOfMonth, controller.signal)
                setEvents(agenda.filter(event => event.date.slice(0, 7) === monthKey))
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

    useEffect(() => {
        const controller = new AbortController()

        const loadTodayEvents = async () => {
            setTodayLoading(true)
            setTodayError(null)

            try {
                const agenda = await getEventAgenda(todayDateKey, controller.signal)
                setTodayEvents(agenda.filter(event => event.date.slice(0, 10) === todayDateKey))
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setTodayEvents([])
                    setTodayError(getUserFacingError(requestError, 'Não foi possível carregar os eventos de hoje. Tente novamente mais tarde.'))
                }
            } finally {
                if (!controller.signal.aborted) {
                    setTodayLoading(false)
                }
            }
        }

        void loadTodayEvents()
        return () => controller.abort()
    }, [todayDateKey])

    const eventsByDate = useMemo(() => {
        const grouped = new Map<string, AgendaEvent[]>()
        for (const event of events) {
            const dateKey = event.date.slice(0, 10)
            const dayEvents = grouped.get(dateKey) ?? []
            dayEvents.push(event)
            grouped.set(dateKey, dayEvents)
        }
        return grouped
    }, [events])

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
    const currentDayEvents = todayEvents.length > 0
        ? todayEvents
        : events.filter(event => event.date.slice(0, 10) === todayDateKey)
    const selectedEvents = selectedDate
        ? selectedDate === todayDateKey
            ? currentDayEvents
            : eventsByDate.get(selectedDate) ?? []
        : []
    const selectedEventsLoading = selectedDate === todayDateKey ? todayLoading : loading
    const selectedDateLabel = selectedDate
        ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${selectedDate}T12:00:00`))
        : ''

    const navigateMonth = (offset: number) => {
        setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
        setSelectedDate(null)
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
                            {loading ? 'Carregando eventos...' : `${events.length} ${events.length === 1 ? 'evento' : 'eventos'} neste mês`}
                        </p>
                    </div>
                    <nav className="calendar-navigation" aria-label="Navegação do calendário">
                        <button
                            type="button"
                            onClick={() => navigateMonth(-1)}
                            aria-label="Mês anterior"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateMonth(1)}
                            aria-label="Próximo mês"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
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
                        const dayEvents = eventsByDate.get(dateKey) ?? []
                        const hasEvents = dayEvents.length > 0
                        const isToday = dateKey === getDateKey(new Date())
                        const isSelected = dateKey === selectedDate
                        const dayLabel = `${cell.day}${hasEvents ? `, ${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}` : ''}`

                        return (
                            <div className="calendar-day" role="gridcell" key={dateKey}>
                                <button
                                    type="button"
                                    className={[
                                        'calendar-day-button',
                                        hasEvents ? 'has-events' : '',
                                        isToday ? 'is-today' : '',
                                        isSelected ? 'is-selected' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => setSelectedDate(dateKey)}
                                    aria-label={dayLabel}
                                    aria-pressed={isSelected}
                                    aria-current={isToday ? 'date' : undefined}
                                    title={hasEvents ? dayEvents.map(event => event.title).join(', ') : undefined}
                                >
                                    <span>{cell.day}</span>
                                    {hasEvents && <span className="calendar-day-indicator" aria-hidden="true" />}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {selectedDate && (
                    <section className="calendar-selected-events" aria-live="polite">
                        <h3>{selectedDateLabel}</h3>
                        {selectedEventsLoading ? (
                            <p role="status">Carregando eventos...</p>
                        ) : selectedEvents.length > 0 ? (
                            <ul>
                                {selectedEvents.map(event => (
                                    <li key={event.id}>
                                        <strong>{event.title}</strong>
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
                events={events}
                loading={loading}
                error={error}
                monthLabel={monthLabel}
                todayEvents={currentDayEvents}
                todayLoading={todayLoading && currentDayEvents.length === 0}
                todayError={todayError}
            />
        </div>
    )
}

export default Calendar
import { useEffect, useMemo, useState } from 'react'
import { getEventAgenda, type AgendaEvent } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import { getCalendarYears, MIN_FILTER_YEAR } from '../../utils/calendarYears'
import Icon from '../Icon'
import CalendarEventsPanel from './CalendarEventsPanel'
import { CALENDAR_EVENT_STATES } from './calendarEvents'
import './Calendar.css'
import './CalendarStatus.css'

const YEAR_STORAGE_KEY = 'brotando-feiras-calendar-year'
const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function getInitialYear() {
    try {
        const saved = window.sessionStorage.getItem(YEAR_STORAGE_KEY)
            ?? window.sessionStorage.getItem('brotando-feiras-calendar-month')?.slice(0, 4)
        if (saved && /^\d{4}$/.test(saved)) return Math.max(MIN_FILTER_YEAR, Number(saved))
    } catch {
        // Session storage is optional.
    }
    return new Date().getFullYear()
}

type YearAgenda = { year: number; events: AgendaEvent[]; error: string | null }

function Calendar() {
    const [year, setYear] = useState(getInitialYear)
    const [agenda, setAgenda] = useState<YearAgenda | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<AgendaEvent['state'] | ''>('')
    const [weekdayFilter, setWeekdayFilter] = useState('')
    const [timeFromFilter, setTimeFromFilter] = useState('')
    const [timeToFilter, setTimeToFilter] = useState('')

    useEffect(() => {
        try {
            window.sessionStorage.setItem(YEAR_STORAGE_KEY, String(year))
        } catch {
            // The calendar also works without session storage.
        }
        const controller = new AbortController()
        getEventAgenda(`${year}-01-01`, controller.signal, 'year').then(events => {
            if (!controller.signal.aborted) setAgenda({ year, events, error: null })
        }).catch(requestError => {
            if (!controller.signal.aborted) {
                const error = getUserFacingError(requestError, 'Não foi possível carregar os eventos deste ano. Tente novamente mais tarde.')
                setAgenda({ year, events: [], error })
            }
        })
        return () => controller.abort()
    }, [year])

    const query = searchTerm.trim().toLocaleLowerCase('pt-BR')
    const visibleEvents = useMemo(() => {
        if (agenda?.year !== year) return []
        return agenda.events.filter(event =>
            (!query || event.title.toLocaleLowerCase('pt-BR').includes(query))
            && (!statusFilter || event.state === statusFilter)
            && (!weekdayFilter || new Date(`${event.date.slice(0, 10)}T12:00:00`).getDay() === Number(weekdayFilter))
            && (!timeFromFilter || event.endAt.slice(0, 5) >= timeFromFilter)
            && (!timeToFilter || event.startAt.slice(0, 5) <= timeToFilter),
        )
    }, [agenda, year, query, statusFilter, weekdayFilter, timeFromFilter, timeToFilter])

    const activeFilterCount = [statusFilter, weekdayFilter, timeFromFilter, timeToFilter].filter(Boolean).length
    const clearFilters = () => {
        setStatusFilter('')
        setWeekdayFilter('')
        setTimeFromFilter('')
        setTimeToFilter('')
    }

    return (
        <div className="calendar-layout">
            <header className="calendar-header">
                <div className="calendar-year">
                    <label htmlFor="calendar-year-select">Ano</label>
                    <div className="calendar-year-controls">
                        <button
                            type="button"
                            aria-label="Ano anterior"
                            disabled={year <= MIN_FILTER_YEAR}
                            onClick={() => setYear(current => Math.max(MIN_FILTER_YEAR, current - 1))}
                        >
                            <Icon name="chevronLeft" />
                        </button>
                        <select id="calendar-year-select" aria-label="Selecionar ano" value={year} onChange={event => setYear(Number(event.target.value))}>
                            {getCalendarYears(year).map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <button type="button" aria-label="Próximo ano" onClick={() => setYear(current => current + 1)}>
                            <Icon name="chevronRight" />
                        </button>
                    </div>
                </div>
                <div className="calendar-events-toolbar">
                    <label className="calendar-events-search">
                        <Icon name="magnifyingGlass" />
                        <input
                            type="search"
                            placeholder="Buscar evento"
                            aria-label="Buscar eventos pelo título"
                            value={searchTerm}
                            onChange={event => setSearchTerm(event.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        className={`calendar-events-filter-button${isFiltersOpen ? ' is-open' : ''}`}
                        aria-controls="calendar-events-filters"
                        aria-expanded={isFiltersOpen}
                        onClick={() => setIsFiltersOpen(open => !open)}
                    >
                        <Icon name="sliders" />
                        Filtros
                        {activeFilterCount > 0 && <span className="calendar-events-filter-count">{activeFilterCount}</span>}
                    </button>
                </div>
            </header>
            {isFiltersOpen && (
                <section className="calendar-events-filters" id="calendar-events-filters" aria-label="Filtros de eventos">
                    <div>
                        <label htmlFor="calendar-status">Status</label>
                        <select id="calendar-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as AgendaEvent['state'] | '')}>
                            <option value="">Todos os status</option>
                            {CALENDAR_EVENT_STATES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="calendar-weekday">Dia da semana</label>
                        <select id="calendar-weekday" value={weekdayFilter} onChange={event => setWeekdayFilter(event.target.value)}>
                            <option value="">Todos os dias</option>
                            {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="calendar-from">Horário a partir de</label>
                        <input id="calendar-from" type="time" value={timeFromFilter} onChange={event => setTimeFromFilter(event.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="calendar-to">Horário até</label>
                        <input id="calendar-to" type="time" value={timeToFilter} onChange={event => setTimeToFilter(event.target.value)} />
                    </div>
                    <button className="calendar-events-clear-filters" type="button" onClick={clearFilters} disabled={activeFilterCount === 0}>
                        Limpar filtros
                    </button>
                </section>
            )}
            <CalendarEventsPanel
                events={visibleEvents}
                filtered={Boolean(query) || activeFilterCount > 0}
                loading={agenda?.year !== year}
                error={agenda?.year === year ? agenda.error : null}
            />
        </div>
    )
}

export default Calendar

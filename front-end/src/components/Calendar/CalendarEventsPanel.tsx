import type { AgendaEvent } from '../../services/eventService'
import './CalendarEventsPanel.css'

type CalendarEventsPanelProps = {
    events: AgendaEvent[]
    loading: boolean
    error: string | null
    monthLabel: string
    todayEvents: AgendaEvent[]
    todayLoading: boolean
    todayError: string | null
    searchTerm: string
    onSearchTermChange: (value: string) => void
    isFiltersOpen: boolean
    onToggleFilters: () => void
    statusFilter: AgendaEvent['state'] | ''
    onStatusFilterChange: (value: AgendaEvent['state'] | '') => void
    weekdayFilter: string
    onWeekdayFilterChange: (value: string) => void
    timeFromFilter: string
    onTimeFromFilterChange: (value: string) => void
    timeToFilter: string
    onTimeToFilterChange: (value: string) => void
    activeFilterCount: number
    onClearFilters: () => void
    weekdayOptions: Array<{ value: string; label: string }>
    statusOptions: Array<{ value: AgendaEvent['state']; label: string }>
}

function formatEventDate(value: string): { day: string; month: string; weekday: string } {
    const dateKey = value.slice(0, 10)
    const date = new Date(`${dateKey}T12:00:00`)

    return {
        day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date),
        month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
        weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date),
    }
}

function formatTime(value: string): string {
    return value.slice(0, 5)
}

function CalendarEventCard({ event, isTodayEvent = false }: { event: AgendaEvent; isTodayEvent?: boolean }) {
    const { day, month, weekday } = formatEventDate(event.date)

    return (
        <li className={`calendar-event-card${isTodayEvent ? ' is-today-event' : ''}`} key={event.id}>
            <div className="calendar-event-card-heading">
                <time className="calendar-event-date" dateTime={event.date.slice(0, 10)}>
                    <strong>{day}</strong>
                    <span>{month}</span>
                </time>
                <div className="calendar-event-card-content">
                    <h3>{event.title}</h3>
                    <p className="calendar-event-detail">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                        </svg>
                        <span>{weekday}, {formatTime(event.startAt)} às {formatTime(event.endAt)}</span>
                    </p>
                </div>
            </div>
            <div className="calendar-event-footer">
                <p className="calendar-event-detail calendar-event-location">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                        <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span>{event.localAddress}</span>
                </p>
                <a className="calendar-event-details-button" href={`#/evento/${encodeURIComponent(event.id)}`}>
                    <span>Ver detalhes</span>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                </a>
            </div>
        </li>
    )
}

function CalendarEventsPanel({
    events,
    loading,
    error,
    monthLabel,
    todayEvents,
    todayLoading,
    todayError,
    searchTerm,
    onSearchTermChange,
    isFiltersOpen,
    onToggleFilters,
    statusFilter,
    onStatusFilterChange,
    weekdayFilter,
    onWeekdayFilterChange,
    timeFromFilter,
    onTimeFromFilterChange,
    timeToFilter,
    onTimeToFilterChange,
    activeFilterCount,
    onClearFilters,
    weekdayOptions,
    statusOptions,
}: CalendarEventsPanelProps) {
    const todayEventIds = new Set(todayEvents.map(event => event.id))
    const otherMonthEvents = events.filter(event => !todayEventIds.has(event.id))
    const hasTodayEvents = !todayLoading && todayEvents.length > 0
    const hasActiveSearchOrFilters = Boolean(searchTerm.trim()) || activeFilterCount > 0

    return (
        <aside className="calendar-events-panel" aria-labelledby="calendar-events-title">
            {todayError && <p className="calendar-events-panel-message is-error" role="alert">Erro ao carregar os eventos de hoje: {todayError}</p>}
            {todayLoading && <p className="calendar-events-panel-message" role="status">Verificando eventos de hoje...</p>}
            {hasTodayEvents && (
                <section className="calendar-events-today" aria-labelledby="calendar-events-today-title">
                    <h2 id="calendar-events-today-title">Acontecendo hoje</h2>
                    <ul className="calendar-events-list">
                        {todayEvents.map(event => <CalendarEventCard event={event} isTodayEvent key={event.id} />)}
                    </ul>
                </section>
            )}

            <div className="calendar-events-toolbar">
                <label className="calendar-events-search">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="10.8" cy="10.8" r="6.8" />
                        <path d="m16 16 4.5 4.5" />
                    </svg>
                    <input
                        type="search"
                        placeholder="Buscar por título do evento"
                        value={searchTerm}
                        onChange={event => onSearchTermChange(event.target.value)}
                        aria-label="Buscar eventos pelo título"
                    />
                </label>
                <button
                    className={`calendar-events-filter-button${isFiltersOpen ? ' is-open' : ''}`}
                    type="button"
                    aria-expanded={isFiltersOpen}
                    aria-controls="calendar-events-filters"
                    onClick={onToggleFilters}
                >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M4 7h16M7 12h10m-7 5h4" />
                    </svg>
                    Filtros
                    {activeFilterCount > 0 && <span className="calendar-events-filter-count">{activeFilterCount}</span>}
                </button>
            </div>
            {isFiltersOpen && (
                <section className="calendar-events-filters" id="calendar-events-filters" aria-label="Filtros de eventos">
                    <label>
                        Status
                        <select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value as AgendaEvent['state'] | '')}>
                            <option value="">Todos os status</option>
                            {statusOptions.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                    </label>
                    <label>
                        Dia da semana
                        <select value={weekdayFilter} onChange={event => onWeekdayFilterChange(event.target.value)}>
                            {weekdayOptions.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                        </select>
                    </label>
                    <label>
                        Horário a partir de
                        <input type="time" value={timeFromFilter} onChange={event => onTimeFromFilterChange(event.target.value)} />
                    </label>
                    <label>
                        Horário até
                        <input type="time" value={timeToFilter} onChange={event => onTimeToFilterChange(event.target.value)} />
                    </label>
                    <button className="calendar-events-clear-filters" type="button" onClick={onClearFilters} disabled={activeFilterCount === 0}>
                        Limpar filtros
                    </button>
                </section>
            )}

            <header className="calendar-events-panel-header">
                <h2 id="calendar-events-title">{hasActiveSearchOrFilters ? 'Resultados dos eventos' : 'Eventos do mês'}</h2>
                <p>{searchTerm.trim() ? `A partir de ${monthLabel}` : monthLabel}</p>
            </header>

            {loading && <p className="calendar-events-panel-message" role="status">Carregando eventos...</p>}
            {error && <p className="calendar-events-panel-message is-error" role="alert">Erro ao carregar os eventos: {error}</p>}
            {!loading && !error && !todayError && otherMonthEvents.length === 0 && todayEvents.length === 0 && !todayLoading && (
                <p className="calendar-events-panel-message">
                    {hasActiveSearchOrFilters ? 'Nenhum evento corresponde à busca e aos filtros selecionados.' : 'Não há eventos programados para este mês.'}
                </p>
            )}
            {!loading && !error && otherMonthEvents.length > 0 && (
                <ul className="calendar-events-list">
                    {otherMonthEvents.map(event => <CalendarEventCard event={event} key={event.id} />)}
                </ul>
            )}
        </aside>
    )
}

export default CalendarEventsPanel

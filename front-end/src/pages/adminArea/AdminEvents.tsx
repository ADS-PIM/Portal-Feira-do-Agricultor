import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
    createAdminEvent,
    deleteAdminEvent,
    getAdminEvents,
    uploadEventBanner,
    updateAdminEvent,
    type AdminEvent,
    type AdminEventInput,
} from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import './AdminEvents.css'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const EVENT_STATES: AdminEvent['state'][] = ['PENDING', 'HAPPENING', 'CONCLUDED', 'CANCELED', 'RESCHEDULED']
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
const STATE_LABELS: Record<AdminEvent['state'], string> = {
    PENDING: 'Agendado',
    HAPPENING: 'Em andamento',
    CONCLUDED: 'Concluído',
    CANCELED: 'Cancelado',
    RESCHEDULED: 'Reagendado',
}

type EventFormValues = {
    title: string
    description: string
    date: string
    startAt: string
    endAt: string
    localAddress: string
    state: AdminEvent['state']
    bannerImage: string | null
}

const emptyForm: EventFormValues = {
    title: '',
    description: '',
    date: '',
    startAt: '',
    endAt: '',
    localAddress: '',
    state: 'PENDING',
    bannerImage: null,
}

function getDateKey(value: string | Date): string {
    if (value instanceof Date) {
        const year = value.getFullYear()
        const month = String(value.getMonth() + 1).padStart(2, '0')
        const day = String(value.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
    return value.slice(0, 10)
}

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${getDateKey(value)}T12:00:00`))
}

function parseCreatedAt(value: string): { date: Date; sortKey: string; hasRecordedTime: boolean } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/.exec(value.trim())
    if (!match) return null

    const [, year, month, day, hour = '00', minute = '00', second = '00', fraction = ''] = match
    const date = new Date(0)
    date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
    date.setUTCHours(Number(hour), Number(minute), Number(second))
    if (
        date.getUTCFullYear() !== Number(year)
        || date.getUTCMonth() !== Number(month) - 1
        || date.getUTCDate() !== Number(day)
        || date.getUTCHours() !== Number(hour)
        || date.getUTCMinutes() !== Number(minute)
        || date.getUTCSeconds() !== Number(second)
    ) {
        return null
    }

    const time = `${hour}:${minute}:${second}`
    const sortKey = `${year}-${month}-${day}T${time}.${fraction.padEnd(6, '0').slice(0, 6)}`
    const hasRecordedTime = match[4] !== undefined && time !== '00:00:00'
    return { date, sortKey, hasRecordedTime }
}

function formatCreatedAt(value: string): string {
    const parsed = parseCreatedAt(value)
    if (!parsed) return 'Data de criação indisponível'

    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeZone: 'UTC',
    }).format(parsed.date)
    if (!parsed.hasRecordedTime) return `${dateLabel} (horário não registrado)`

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
    }).format(parsed.date)
}

function toFormValues(event: AdminEvent): EventFormValues {
    return {
        title: event.title,
        description: event.description ?? '',
        date: getDateKey(event.date),
        startAt: event.startAt.slice(0, 5),
        endAt: event.endAt.slice(0, 5),
        localAddress: event.localAddress,
        state: event.state,
        bannerImage: event.bannerImage,
    }
}

function AdminEventForm({
    initialValues,
    isSaving,
    error,
    onClose,
    onSubmit,
}: {
    initialValues: EventFormValues
    isSaving: boolean
    error: string | null
    onClose: () => void
    onSubmit: (values: EventFormValues, bannerFile: File | null) => void
}) {
    const [values, setValues] = useState(initialValues)
    const [bannerFile, setBannerFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)

    useEffect(() => () => {
        if (filePreview) URL.revokeObjectURL(filePreview)
    }, [filePreview])

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        onSubmit(values, bannerFile)
    }

    const chooseBanner = (file: File | undefined) => {
        setFileError(null)
        if (!file) return
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setFileError('Selecione uma imagem JPG ou PNG.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setFileError('A imagem deve ter no máximo 5 MB.')
            return
        }
        setBannerFile(file)
        setFilePreview(URL.createObjectURL(file))
        setValues(current => ({ ...current, bannerImage: null }))
    }

    return (
        <div className="admin-event-modal-backdrop" role="presentation" onMouseDown={event => {
            if (event.target === event.currentTarget && !isSaving) onClose()
        }}>
            <section className="admin-event-modal" role="dialog" aria-modal="true" aria-labelledby="admin-event-form-title">
                <header className="admin-event-modal-header">
                    <h2 id="admin-event-form-title">Detalhes da Agenda</h2>
                    <button type="button" className="admin-event-modal-close" onClick={onClose} aria-label="Fechar" disabled={isSaving}>×</button>
                </header>
                <form className="admin-event-form" onSubmit={submit}>
                    {error && <p className="admin-events-alert is-error" role="alert">{error}</p>}
                    <div className="admin-event-form-grid is-two">
                        <label>
                            Nome do Evento
                            <input
                                required
                                value={values.title}
                                onChange={event => setValues(current => ({ ...current, title: event.target.value }))}
                            />
                        </label>
                        <label>
                            Data do Encontro
                            <input
                                required
                                type="date"
                                value={values.date}
                                onChange={event => setValues(current => ({ ...current, date: event.target.value }))}
                            />
                        </label>
                    </div>
                    <div className="admin-event-form-grid is-three">
                        <label>
                            Horário de Início
                            <input
                                required
                                type="time"
                                value={values.startAt}
                                onChange={event => setValues(current => ({ ...current, startAt: event.target.value }))}
                            />
                        </label>
                        <label>
                            Horário de Término
                            <input
                                required
                                type="time"
                                value={values.endAt}
                                onChange={event => setValues(current => ({ ...current, endAt: event.target.value }))}
                            />
                        </label>
                        <label>
                            Local / Endereço
                            <input
                                required
                                value={values.localAddress}
                                onChange={event => setValues(current => ({ ...current, localAddress: event.target.value }))}
                            />
                        </label>
                    </div>
                    <div className="admin-event-form-grid is-description-banner">
                        <label>
                            Descrição do Evento
                            <textarea
                                rows={3}
                                value={values.description}
                                onChange={event => setValues(current => ({ ...current, description: event.target.value }))}
                            />
                        </label>
                        <div className="admin-event-banner-field">
                            <span className="admin-event-form-label">Imagem de Capa (Opcional)</span>
                            <div className="admin-event-banner-upload">
                                {filePreview || values.bannerImage ? (
                                    <img
                                        className="admin-event-banner-preview"
                                        src={filePreview ?? values.bannerImage ?? ''}
                                        alt="Pré-visualização do banner do evento"
                                    />
                                ) : (
                                    <span className="admin-event-banner-placeholder" aria-hidden="true" />
                                )}
                                <div className="admin-event-banner-upload-content">
                                    <label className="admin-event-banner-upload-button" htmlFor="admin-event-banner-file">
                                        Fazer Upload
                                    </label>
                                    <input
                                        id="admin-event-banner-file"
                                        className="admin-event-banner-file-input"
                                        type="file"
                                        accept="image/jpeg,image/png"
                                        disabled={isSaving}
                                        onChange={event => {
                                            chooseBanner(event.target.files?.[0])
                                            event.currentTarget.value = ''
                                        }}
                                    />
                                    <small>Formatos JPG ou PNG · até 5 MB</small>
                                </div>
                                {(filePreview || values.bannerImage) && (
                                    <button
                                        type="button"
                                        className="admin-event-banner-remove"
                                        aria-label="Remover imagem de capa"
                                        disabled={isSaving}
                                        onClick={() => {
                                            setBannerFile(null)
                                            setFilePreview(null)
                                            setValues(current => ({ ...current, bannerImage: null }))
                                            setFileError(null)
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            {fileError && <small className="admin-event-banner-error" role="alert">{fileError}</small>}
                        </div>
                    </div>
                    <fieldset className="admin-event-status-field">
                        <legend>Status</legend>
                        <div className="admin-event-status-options">
                            {EVENT_STATES.map(state => (
                                <button
                                    type="button"
                                    key={state}
                                    className={`admin-event-status-option${values.state === state ? ' is-selected' : ''}`}
                                    aria-pressed={values.state === state}
                                    onClick={() => setValues(current => ({ ...current, state }))}
                                >
                                    <span aria-hidden="true" />
                                    {state === 'PENDING' ? 'Agendado (Aparece na Agenda)' : STATE_LABELS[state]}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <footer className="admin-event-form-actions">
                        <p>Este evento será publicado de imediato no mural público.</p>
                        <div>
                            <button type="button" className="admin-event-button is-secondary" onClick={onClose} disabled={isSaving}>Cancelar</button>
                            <button type="submit" className="admin-event-button is-primary" disabled={isSaving || Boolean(fileError)}>
                                {isSaving ? 'Salvando...' : 'Confirmar Evento'}
                            </button>
                        </div>
                    </footer>
                </form>
            </section>
        </div>
    )
}

const AdminEvents = () => {
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<AdminEvent['state'] | ''>('')
    const [weekdayFilter, setWeekdayFilter] = useState('')
    const [timeFromFilter, setTimeFromFilter] = useState('')
    const [timeToFilter, setTimeToFilter] = useState('')
    const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null)
    const [eventPendingDeletion, setEventPendingDeletion] = useState<AdminEvent | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const monthKey = getMonthKey(visibleMonth)
    const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
        .format(visibleMonth)
        .replace(/^./, character => character.toLocaleUpperCase('pt-BR'))

    const loadEvents = useCallback((signal?: AbortSignal) => getAdminEvents(signal), [])

    useEffect(() => {
        const controller = new AbortController()
        void loadEvents(controller.signal)
            .then(result => {
                if (!controller.signal.aborted) setEvents(result ?? [])
            })
            .catch(error => {
                if (!controller.signal.aborted) {
                    setLoadError(getUserFacingError(error, 'Não foi possível carregar os eventos.'))
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false)
            })
        return () => controller.abort()
    }, [loadEvents])

    const eventsByDate = useMemo(() => {
        const grouped = new Map<string, AdminEvent[]>()
        events.forEach(event => {
            const dateKey = getDateKey(event.date)
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
            const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)
            return { day, date: getDateKey(date), outside: false }
        })
    }, [visibleMonth])

    const filteredEvents = useMemo(() => {
        const query = searchTerm.trim().toLocaleLowerCase('pt-BR')
        return events
            .filter(event => {
                const matchesSearch = !query || event.title.toLocaleLowerCase('pt-BR').includes(query)
                const matchesDate = query || selectedDate
                    ? !selectedDate || getDateKey(event.date) === selectedDate
                    : getDateKey(event.date).startsWith(monthKey)
                const matchesStatus = !statusFilter || event.state === statusFilter
                const eventWeekday = new Date(`${getDateKey(event.date)}T12:00:00`).getDay().toString()
                const matchesWeekday = !weekdayFilter || eventWeekday === weekdayFilter
                const startsAt = event.startAt.slice(0, 5)
                const endsAt = event.endAt.slice(0, 5)
                const matchesTime = (!timeFromFilter || endsAt >= timeFromFilter)
                    && (!timeToFilter || startsAt <= timeToFilter)
                return matchesSearch && matchesDate && matchesStatus && matchesWeekday && matchesTime
            })
            .sort((first, second) => {
                const firstDate = `${getDateKey(first.date)}T${first.startAt}`
                const secondDate = `${getDateKey(second.date)}T${second.startAt}`
                return firstDate.localeCompare(secondDate)
            })
    }, [events, monthKey, searchTerm, selectedDate, statusFilter, timeFromFilter, timeToFilter, weekdayFilter])
    const latestCreatedEvent = useMemo(
        () => events.reduce<AdminEvent | null>((latest, event) => {
            if (!latest) return event
            const eventCreatedAt = parseCreatedAt(event.createdAt)?.sortKey
            const latestCreatedAt = parseCreatedAt(latest.createdAt)?.sortKey
            if (!eventCreatedAt) {
                return !latestCreatedAt && event.id.localeCompare(latest.id) > 0 ? event : latest
            }
            if (!latestCreatedAt) return event
            if (eventCreatedAt !== latestCreatedAt) return eventCreatedAt > latestCreatedAt ? event : latest
            return event.id.localeCompare(latest.id) > 0 ? event : latest
        }, null),
        [events],
    )

    const activeFilterCount = [statusFilter, weekdayFilter, timeFromFilter, timeToFilter].filter(Boolean).length

    const clearFilters = () => {
        setStatusFilter('')
        setWeekdayFilter('')
        setTimeFromFilter('')
        setTimeToFilter('')
    }

    const closeForm = () => {
        if (isSaving) return
        setIsCreating(false)
        setEditingEvent(null)
        setFormError(null)
    }

    const saveEvent = async (values: EventFormValues, bannerFile: File | null) => {
        if (values.startAt >= values.endAt) {
            setFormError('O horário de término deve ser posterior ao horário de início.')
            return
        }

        setIsSaving(true)
        setFormError(null)
        try {
            const bannerImage = bannerFile ? (await uploadEventBanner(bannerFile)).url : values.bannerImage
            const eventInput: AdminEventInput = {
                ...values,
                description: values.description || null,
                bannerImage,
            }
            if (editingEvent) {
                await updateAdminEvent(editingEvent.id, eventInput)
                setActionMessage('Evento atualizado com sucesso.')
            } else {
                await createAdminEvent(eventInput)
                setActionMessage('Evento criado com sucesso.')
            }
            setIsCreating(false)
            setEditingEvent(null)
            setIsLoading(true)
            setLoadError(null)
            try {
                const result = await loadEvents()
                setEvents(result ?? [])
            } catch (error) {
                setLoadError(getUserFacingError(error, 'O evento foi salvo, mas não foi possível atualizar a lista.'))
            } finally {
                setIsLoading(false)
            }
        } catch (error) {
            setFormError(getUserFacingError(error, 'Não foi possível salvar o evento.'))
        } finally {
            setIsSaving(false)
        }
    }

    const removeEvent = async () => {
        if (!eventPendingDeletion || isDeleting) return
        setActionMessage(null)
        setIsDeleting(true)
        try {
            await deleteAdminEvent(eventPendingDeletion.id)
            setEvents(current => current.filter(item => item.id !== eventPendingDeletion.id))
            setEventPendingDeletion(null)
            setActionMessage('Evento excluído com sucesso.')
        } catch (error) {
            setLoadError(getUserFacingError(error, 'Não foi possível excluir o evento.'))
        } finally {
            setIsDeleting(false)
        }
    }

    const shiftMonth = (offset: number) => {
        setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
        setSelectedDate(null)
    }

    return (
        <div className="admin-events">
            <header className="admin-events-heading">
                <h1>Calendário e Eventos</h1>
                <p>Organize e promova os encontros dos produtores e feiras agendadas</p>
            </header>

            <section className="admin-events-workspace" aria-label="Gerenciamento de eventos">
                <div className="admin-events-toolbar">
                    <div className="admin-events-search-controls">
                        <label className="admin-events-search">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <circle cx="10.8" cy="10.8" r="6.8" />
                                <path d="m16 16 4.5 4.5" />
                            </svg>
                            <input
                                type="search"
                                placeholder="Buscar por título do evento"
                                value={searchTerm}
                                onChange={event => {
                                    setSearchTerm(event.target.value)
                                    setSelectedDate(null)
                                }}
                                aria-label="Buscar eventos pelo título"
                            />
                        </label>
                        <button
                            className={`admin-events-filter-button${isFiltersOpen ? ' is-open' : ''}`}
                            type="button"
                            aria-expanded={isFiltersOpen}
                            aria-controls="admin-events-filters"
                            onClick={() => setIsFiltersOpen(open => !open)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 7h16M7 12h10m-7 5h4" />
                            </svg>
                            Filtros
                            {activeFilterCount > 0 && <span className="admin-events-filter-count">{activeFilterCount}</span>}
                        </button>
                    </div>
                    <button
                        className="admin-events-create"
                        type="button"
                        onClick={() => {
                            setActionMessage(null)
                            setFormError(null)
                            setEditingEvent(null)
                            setIsCreating(true)
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                        Criar Evento
                    </button>
                </div>

                {isFiltersOpen && (
                    <section className="admin-events-filters" id="admin-events-filters" aria-label="Filtros de eventos">
                        <label>
                            Status
                            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as AdminEvent['state'] | '')}>
                                <option value="">Todos os status</option>
                                {EVENT_STATES.map(state => <option key={state} value={state}>{STATE_LABELS[state]}</option>)}
                            </select>
                        </label>
                        <label>
                            Dia da semana
                            <select value={weekdayFilter} onChange={event => setWeekdayFilter(event.target.value)}>
                                {WEEKDAY_OPTIONS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                            </select>
                        </label>
                        <label>
                            Horário a partir de
                            <input type="time" value={timeFromFilter} onChange={event => setTimeFromFilter(event.target.value)} />
                        </label>
                        <label>
                            Horário até
                            <input type="time" value={timeToFilter} onChange={event => setTimeToFilter(event.target.value)} />
                        </label>
                        <button className="admin-events-clear-filters" type="button" onClick={clearFilters} disabled={activeFilterCount === 0}>
                            Limpar filtros
                        </button>
                    </section>
                )}

                {actionMessage && <p className="admin-events-alert is-success" role="status">{actionMessage}</p>}
                {loadError && <p className="admin-events-alert is-error" role="alert">{loadError}</p>}

                <div className="admin-events-columns">
                    <section className="admin-events-calendar" aria-labelledby="admin-calendar-title">
                        <header className="admin-events-calendar-header">
                            <h2 id="admin-calendar-title">{monthLabel}</h2>
                            <div className="admin-events-month-navigation">
                                <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <button type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        </header>
                        <div className="admin-events-calendar-grid" role="grid" aria-label={monthLabel}>
                            {WEEKDAYS.map(day => <span className="admin-events-weekday" role="columnheader" key={day}>{day}</span>)}
                            {calendarDays.map((cell, index) => {
                                if (cell.outside || !cell.date) {
                                    return <span className="admin-events-day is-outside" role="gridcell" key={`outside-${index}`}>{cell.day}</span>
                                }
                                const hasEvents = (eventsByDate.get(cell.date)?.length ?? 0) > 0
                                return (
                                    <div className="admin-events-day" role="gridcell" key={cell.date}>
                                        <button
                                            type="button"
                                            className={`admin-events-day-button${hasEvents ? ' has-events' : ''}${selectedDate === cell.date ? ' is-selected' : ''}`}
                                            aria-pressed={selectedDate === cell.date}
                                            aria-label={`${cell.day}${hasEvents ? ', contém eventos' : ''}`}
                                            title={hasEvents ? eventsByDate.get(cell.date)?.map(event => event.title).join(', ') : undefined}
                                            onClick={() => {
                                                setSelectedDate(selectedDate === cell.date ? null : cell.date)
                                                setSearchTerm('')
                                            }}
                                        >
                                            <span>{cell.day}</span>
                                            {hasEvents && <span className="admin-events-day-indicator" aria-hidden="true" />}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </section>

                    <section className="admin-events-agenda" aria-labelledby="admin-events-agenda-title">
                        <h2 id="admin-events-agenda-title">
                            {searchTerm.trim() || activeFilterCount > 0 ? 'Resultados dos eventos' : selectedDate ? formatDate(selectedDate) : 'Agenda do Mês'}
                        </h2>
                        {isLoading ? (
                            <p className="admin-events-empty" role="status">Carregando eventos...</p>
                        ) : filteredEvents.length ? (
                            <ul className="admin-events-list">
                                {filteredEvents.map(event => (
                                    <li className="admin-event-card" key={event.id}>
                                        <div className="admin-event-card-meta">
                                            <span className={`admin-event-status is-${event.state.toLowerCase()}`}>{STATE_LABELS[event.state]}</span>
                                            <span className="admin-event-id">ID: #{event.id.slice(0, 6)}</span>
                                        </div>
                                        <h3>{event.title}</h3>
                                        {event.description && <p className="admin-event-description">{event.description}</p>}
                                        <p className="admin-event-detail">
                                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 10h16" /></svg>
                                            <span>{formatDate(event.date)}</span>
                                        </p>
                                        <p className="admin-event-detail">
                                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                            <span>{event.startAt.slice(0, 5)} - {event.endAt.slice(0, 5)}</span>
                                        </p>
                                        <p className="admin-event-detail">
                                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                                            <span>{event.localAddress}</span>
                                        </p>
                                        <div className="admin-event-actions">
                                            <button
                                                type="button"
                                                className="admin-event-action is-edit"
                                                onClick={() => {
                                                    setActionMessage(null)
                                                    setFormError(null)
                                                    setEditingEvent(event)
                                                }}
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                                                Editar
                                            </button>
                                            <button type="button" className="admin-event-action is-delete" onClick={() => setEventPendingDeletion(event)}>
                                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.8 14H5.8L5 6m4 4v6m6-6v6" /></svg>
                                                Excluir
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="admin-events-empty">
                                {searchTerm.trim() || activeFilterCount > 0
                                    ? 'Nenhum evento corresponde à busca e aos filtros selecionados.'
                                    : selectedDate
                                        ? 'Nenhum evento marcado para este dia.'
                                        : 'Não há eventos programados para este mês.'}
                            </p>
                        )}
                        {latestCreatedEvent && (
                            <section className="admin-latest-event" aria-labelledby="admin-latest-event-title">
                                <h2 id="admin-latest-event-title">Último evento criado</h2>
                                <article className="admin-event-card">
                                    <div className="admin-event-card-meta">
                                        <span className={`admin-event-status is-${latestCreatedEvent.state.toLowerCase()}`}>
                                            {STATE_LABELS[latestCreatedEvent.state]}
                                        </span>
                                        <span className="admin-event-id">ID: #{latestCreatedEvent.id.slice(0, 6)}</span>
                                    </div>
                                    <h3>{latestCreatedEvent.title}</h3>
                                    {latestCreatedEvent.description && (
                                        <p className="admin-event-description">{latestCreatedEvent.description}</p>
                                    )}
                                    <p className="admin-event-detail">
                                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <rect x="4" y="5" width="16" height="16" rx="2" />
                                            <path d="M8 3v4m8-4v4M4 10h16" />
                                        </svg>
                                        <span>{formatDate(latestCreatedEvent.date)}</span>
                                    </p>
                                    <p className="admin-event-detail">
                                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M12 7v5l3 2" />
                                        </svg>
                                        <span>{latestCreatedEvent.startAt.slice(0, 5)} - {latestCreatedEvent.endAt.slice(0, 5)}</span>
                                    </p>
                                    <p className="admin-event-detail">
                                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                            <circle cx="12" cy="10" r="2.5" />
                                        </svg>
                                        <span>{latestCreatedEvent.localAddress}</span>
                                    </p>
                                    <p className="admin-event-created-at">Criado em {formatCreatedAt(latestCreatedEvent.createdAt)}</p>
                                    <div className="admin-event-actions">
                                        <button
                                            type="button"
                                            className="admin-event-action is-edit"
                                            onClick={() => {
                                                setActionMessage(null)
                                                setFormError(null)
                                                setEditingEvent(latestCreatedEvent)
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                            </svg>
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-event-action is-delete"
                                            onClick={() => setEventPendingDeletion(latestCreatedEvent)}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <path d="M3 6h18M8 6V4h8v2m3 0-.8 14H5.8L5 6m4 4v6m6-6v6" />
                                            </svg>
                                            Excluir
                                        </button>
                                    </div>
                                </article>
                            </section>
                        )}
                    </section>
                </div>
            </section>

            {(isCreating || editingEvent) && (
                <AdminEventForm
                    initialValues={editingEvent ? toFormValues(editingEvent) : emptyForm}
                    isSaving={isSaving}
                    error={formError}
                    onClose={closeForm}
                    onSubmit={(values, bannerFile) => void saveEvent(values, bannerFile)}
                />
            )}
            {eventPendingDeletion && (
                <div
                    className="admin-event-modal-backdrop"
                    role="presentation"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget && !isDeleting) setEventPendingDeletion(null)
                    }}
                >
                    <section
                        className="admin-event-modal admin-event-delete-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="admin-event-delete-title"
                        aria-describedby="admin-event-delete-description"
                    >
                        <span className="admin-event-delete-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M12 3 2.8 19h18.4L12 3Z" />
                                <path d="M12 9v4m0 3h.01" />
                            </svg>
                        </span>
                        <h2 id="admin-event-delete-title">Excluir evento?</h2>
                        <p id="admin-event-delete-description">
                            Tem certeza de que deseja excluir <strong>{eventPendingDeletion.title}</strong>? Esta ação não pode ser desfeita.
                        </p>
                        {loadError && <p className="admin-events-alert is-error" role="alert">{loadError}</p>}
                        <footer className="admin-event-delete-actions">
                            <button
                                type="button"
                                className="admin-event-button is-secondary"
                                onClick={() => setEventPendingDeletion(null)}
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="admin-event-button is-danger"
                                onClick={() => void removeEvent()}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Excluindo...' : 'Excluir evento'}
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    )
}

export default AdminEvents

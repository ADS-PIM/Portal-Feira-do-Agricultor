import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import {
    createAdminEvent,
    deleteAdminEvent,
    getAdminEvents,
    uploadEventBanner,
    updateAdminEvent,
    type AdminEventWithAuthor as AdminEvent,
    type AdminEventInput,
} from '../../services/eventService'
import { getAdminProfile } from '../../services/authToken'
import { getUserFacingError } from '../../services/errors'
import { matchesEventTimeRange } from './eventTimeFilter'
import CreateEventButton from './CreateEventButton'
import './AdminEvents.css'
import '../../components/Calendar/CalendarStatus.css'
import AdminEventForm, { type EventFormValues, type EventSaveSession } from './AdminEventForm'
import { STATE_LABELS } from './eventFormLabels'
import { getCoordinates } from '../../utils/eventLocation'

const EVENTS_PAGE_SIZE = 12
const EVENT_STATES: AdminEvent['state'][] = ['PENDING', 'HAPPENING', 'CONCLUDED', 'CANCELED', 'RESCHEDULED']
const MONTH_OPTIONS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
].map((label, index) => ({ value: String(index + 1).padStart(2, '0'), label }))
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
const emptyForm: EventFormValues = {
    title: '',
    description: '',
    date: '',
    startAt: '',
    endAt: '',
    localAddress: '',
    latitude: null,
    longitude: null,
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

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${getDateKey(value)}T12:00:00`))
}

function toFormValues(event: AdminEvent): EventFormValues {
    const coordinates = getCoordinates(event.localLatitude, event.localLongitude)
    return {
        title: event.title,
        description: event.description ?? '',
        date: getDateKey(event.date),
        startAt: event.startAt.slice(0, 5),
        endAt: event.endAt.slice(0, 5),
        localAddress: event.localAddress,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        state: event.state,
        bannerImage: event.bannerImage,
    }
}

const AdminEvents = ({
    initialEventDate = null,
    openCreateOnMount = false,
    initialEventAction = null,
}: {
    initialEventDate?: string | null
    openCreateOnMount?: boolean
    initialEventAction?: { eventId: string; action: 'edit' | 'delete' } | null
}) => {
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [visibleEventCount, setVisibleEventCount] = useState(EVENTS_PAGE_SIZE)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<AdminEvent['state'] | ''>('')
    const [yearFilter, setYearFilter] = useState('')
    const [monthFilter, setMonthFilter] = useState('')
    const [weekdayFilter, setWeekdayFilter] = useState('')
    const [timeFromFilter, setTimeFromFilter] = useState('')
    const [timeToFilter, setTimeToFilter] = useState('')
    const [administratorFilter, setAdministratorFilter] = useState('')
    const [newEventDate, setNewEventDate] = useState(initialEventDate ?? '')
    const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null)
    const [eventPendingDeletion, setEventPendingDeletion] = useState<AdminEvent | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCreating, setIsCreating] = useState(openCreateOnMount)
    const [isSaving, setIsSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const handledInitialAction = useRef<string | null>(null)
    const currentAdmin = getAdminProfile()
    const currentAdminId = currentAdmin?.id

    const loadEvents = useCallback((signal?: AbortSignal) => getAdminEvents(signal), [])

    useEffect(() => {
        const controller = new AbortController()
        void loadEvents(controller.signal)
            .then(result => {
                if (controller.signal.aborted) return

                const loadedEvents = result ?? []
                setEvents(loadedEvents)

                if (!initialEventAction) return
                const requestKey = `${initialEventAction.action}:${initialEventAction.eventId}`
                if (handledInitialAction.current === requestKey) return
                handledInitialAction.current = requestKey

                const requestedEvent = loadedEvents.find(event => event.id === initialEventAction.eventId)
                if (!requestedEvent) {
                    setLoadError('O evento selecionado não foi encontrado na agenda.')
                    return
                }

                setActionMessage(null)
                if (initialEventAction.action === 'edit') {
                    setIsCreating(false)
                    setNewEventDate('')
                    setFormError(null)
                    setEditingEvent(requestedEvent)
                } else {
                    setEventPendingDeletion(requestedEvent)
                }
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
    }, [loadEvents, initialEventAction])

    const availableYears = useMemo(
        () => [...new Set(events.map(event => getDateKey(event.date).slice(0, 4)))]
            .sort((first, second) => second.localeCompare(first)),
        [events],
    )

    const availableAdministrators = useMemo(() => {
        const authors = new Map<string, { id: string; name: string; active: boolean }>()
        events.forEach(event => authors.set(event.administratorId, {
            id: event.administratorId,
            name: event.administratorName,
            active: event.administratorActive,
        }))
        return [...authors.values()].sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
    }, [events])

    const filteredEvents = useMemo(() => {
        const query = searchTerm.trim().toLocaleLowerCase('pt-BR')
        const now = new Date()
        const currentDateTime = `${getDateKey(now)}T${now.toTimeString().slice(0, 5)}`
        return events
            .filter(event => {
                const matchesSearch = !query || event.title.toLocaleLowerCase('pt-BR').includes(query)
                const matchesYear = !yearFilter || getDateKey(event.date).startsWith(yearFilter)
                const matchesMonth = !monthFilter || getDateKey(event.date).slice(5, 7) === monthFilter
                const matchesStatus = !statusFilter || event.state === statusFilter
                const eventWeekday = new Date(`${getDateKey(event.date)}T12:00:00`).getDay().toString()
                const matchesWeekday = !weekdayFilter || eventWeekday === weekdayFilter
                const matchesTime = matchesEventTimeRange(event, timeFromFilter, timeToFilter)
                const matchesAdministrator = !administratorFilter || event.administratorId === (
                    administratorFilter === 'mine' ? currentAdminId : administratorFilter
                )
                return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesWeekday && matchesTime && matchesAdministrator
            })
            .sort((first, second) => {
                const firstDate = `${getDateKey(first.date)}T${first.startAt.slice(0, 5)}`
                const secondDate = `${getDateKey(second.date)}T${second.startAt.slice(0, 5)}`
                const firstUpcoming = firstDate >= currentDateTime
                const secondUpcoming = secondDate >= currentDateTime
                if (firstUpcoming !== secondUpcoming) return firstUpcoming ? -1 : 1
                return firstUpcoming
                    ? firstDate.localeCompare(secondDate)
                    : secondDate.localeCompare(firstDate)
            })
    }, [events, searchTerm, statusFilter, timeFromFilter, timeToFilter, weekdayFilter, yearFilter, monthFilter, administratorFilter, currentAdminId])

    const visibleEvents = filteredEvents.slice(0, visibleEventCount)
    const hasMoreEvents = visibleEvents.length < filteredEvents.length
    const activeFilterCount = [statusFilter, yearFilter, monthFilter, weekdayFilter, timeFromFilter, timeToFilter, administratorFilter].filter(Boolean).length

    const clearFilters = () => {
        setVisibleEventCount(EVENTS_PAGE_SIZE)
        setStatusFilter('')
        setYearFilter('')
        setMonthFilter('')
        setWeekdayFilter('')
        setTimeFromFilter('')
        setTimeToFilter('')
        setAdministratorFilter('')
    }

    const closeForm = () => {
        if (isSaving) return
        setIsCreating(false)
        setNewEventDate('')
        setEditingEvent(null)
        setFormError(null)
    }

    const saveEvent = async (values: EventFormValues, bannerFile: File | null, session: EventSaveSession, saveGallery: (id: string) => Promise<void>) => {
        if (isSaving) return
        if (values.startAt >= values.endAt) {
            setFormError('O horário de término deve ser posterior ao horário de início.')
            return
        }

        setIsSaving(true)
        setFormError(null)
        let eventSaved = false
        try {
            if (bannerFile && session.banner?.file !== bannerFile) {
                session.banner = { file: bannerFile, url: (await uploadEventBanner(bannerFile)).url }
            }
            const bannerImage = bannerFile ? session.banner!.url : values.bannerImage
            const eventInput: AdminEventInput = {
                ...values,
                description: values.description || null,
                bannerImage,
            }
            if (session.eventId) {
                await updateAdminEvent(session.eventId, eventInput)
            } else {
                const result = await createAdminEvent(eventInput)
                session.eventId = result.id
            }
            eventSaved = true
            const savedEvent: AdminEvent = {
                ...eventInput,
                localLatitude: eventInput.latitude,
                localLongitude: eventInput.longitude,
                id: session.eventId,
                createdAt: editingEvent?.createdAt ?? new Date().toISOString(),
                administratorId: editingEvent?.administratorId ?? currentAdmin!.id,
                administratorName: editingEvent?.administratorName ?? currentAdmin!.name,
                administratorActive: editingEvent?.administratorActive ?? Boolean(currentAdmin!.active),
            }
            setEvents(current => current.some(event => event.id === savedEvent.id)
                ? current.map(event => event.id === savedEvent.id ? savedEvent : event)
                : [...current, savedEvent])
            await saveGallery(session.eventId)
            setActionMessage(editingEvent ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.')
            setIsCreating(false)
            setNewEventDate('')
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
            setFormError(eventSaved
                ? `O evento foi salvo, mas algumas fotos ainda estão pendentes. ${getUserFacingError(error, 'Não foi possível enviar todas as fotos.')} Clique em salvar novamente para retomar o envio.`
                : getUserFacingError(error, 'Não foi possível salvar o evento.'))
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

    return (
        <div className="admin-events">
            <header className="admin-events-heading">
                <h1>Eventos</h1>
                <p>Gerencie os eventos cadastrados e suas informações</p>
            </header>

            <section className="admin-events-workspace" aria-label="Gerenciamento de eventos">
                <div className="admin-events-toolbar">
                    <div className="admin-events-search-controls">
                        <label className="admin-events-search">
                            <Icon name="magnifyingGlass" />
                            <input
                                type="search"
                                placeholder="Buscar por título do evento"
                                value={searchTerm}
                                onChange={event => {
                                    setSearchTerm(event.target.value)
                                    setVisibleEventCount(EVENTS_PAGE_SIZE)
                                }}
                                aria-label="Buscar eventos pelo título"
                            />
                        </label>
                        <button
                            className={`admin-events-filter-button${isFiltersOpen ? ' is-open' : ''}`}
                            type="button"
                            aria-expanded={isFiltersOpen}
                            aria-controls="admin-events-filters"
                            aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : 'Filtros'}
                            title="Filtros"
                            onClick={() => setIsFiltersOpen(open => !open)}
                        >
                            <Icon name="sliders" />
                            <span className="admin-event-action-label">Filtros</span>
                            {activeFilterCount > 0 && <span className="admin-events-filter-count">{activeFilterCount}</span>}
                        </button>
                    </div>
                    <CreateEventButton
                        onClick={() => {
                            setActionMessage(null)
                            setFormError(null)
                            setEditingEvent(null)
                            setNewEventDate(initialEventDate ?? '')
                            setIsCreating(true)
                        }}
                    />
                </div>

                {isFiltersOpen && (
                    <section className="admin-events-filters" id="admin-events-filters" aria-label="Filtros de eventos">
                        <label>
                            Ano
                            <select value={yearFilter} onChange={event => {
                                setYearFilter(event.target.value)
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }}>
                                <option value="">Todos os anos</option>
                                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </label>
                        <label>
                            Mês
                            <select value={monthFilter} onChange={event => {
                                setMonthFilter(event.target.value)
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }}>
                                <option value="">Todos os meses</option>
                                {MONTH_OPTIONS.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                            </select>
                        </label>
                        <label>
                            Dia da semana
                            <select value={weekdayFilter} onChange={event => {
                                setWeekdayFilter(event.target.value)
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }}>
                                {WEEKDAY_OPTIONS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                            </select>
                        </label>
                        <label>
                            Horário a partir de
                            <input type="time" value={timeFromFilter} onChange={event => {
                                setTimeFromFilter(event.target.value)
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }} />
                        </label>
                        <label>
                            Horário até
                            <input type="time" value={timeToFilter} onChange={event => {
                                setTimeToFilter(event.target.value)
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }} />
                        </label>
                        <label>
                            Status
                            <select value={statusFilter} onChange={event => {
                                setStatusFilter(event.target.value as AdminEvent['state'] | '')
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }}>
                                <option value="">Todos os status</option>
                                {EVENT_STATES.map(state => <option key={state} value={state}>{STATE_LABELS[state]}</option>)}
                            </select>
                        </label>
                        <label>
                            Administrador
                            <select value={administratorFilter} onChange={event => {
                                setAdministratorFilter(event.target.value)
                                setVisibleEventCount(EVENTS_PAGE_SIZE)
                            }}>
                                <option value="">Todos os administradores</option>
                                <option value="mine">Meus eventos</option>
                                {availableAdministrators.map(admin => (
                                    <option key={admin.id} value={admin.id}>
                                        {admin.name}{admin.active ? '' : ' (desativado)'}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button className="admin-events-clear-filters" type="button" onClick={clearFilters} disabled={activeFilterCount === 0}>
                            Limpar filtros
                        </button>
                    </section>
                )}

                {actionMessage && <p className="admin-events-alert is-success" role="status">{actionMessage}</p>}
                {loadError && <p className="admin-events-alert is-error" role="alert">{loadError}</p>}

                <section className="admin-events-agenda admin-events-all-list" aria-labelledby="admin-events-agenda-title">
                    <h2 id="admin-events-agenda-title">
                        {searchTerm.trim() || activeFilterCount > 0 ? 'Resultados dos eventos' : 'Todos os eventos'}
                        {!isLoading && !loadError && (
                            <span className="admin-events-result-count" aria-label={`${filteredEvents.length} eventos`}>
                                {filteredEvents.length}
                            </span>
                        )}
                    </h2>
                    {isLoading ? (
                        <p className="admin-events-empty" role="status">Carregando eventos...</p>
                    ) : filteredEvents.length ? (
                        <ul className="admin-events-list" id="admin-events-list">
                            {visibleEvents.map(event => (
                                <li className="admin-event-card" key={event.id}>
                                    <div className="admin-event-title-row">
                                        <h3>{event.title}</h3>
                                        <span className={`admin-event-status calendar-status--${event.state}`}>{STATE_LABELS[event.state]}</span>
                                    </div>
                                    {event.description && <p className="admin-event-description">{event.description}</p>}
                                    <p className="admin-event-detail">
                                        <Icon name="calendar" />
                                        <span>{formatDate(event.date)}</span>
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
                                            href={`#/evento/${encodeURIComponent(event.id)}`}
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
                                            onClick={() => {
                                                setActionMessage(null)
                                                setFormError(null)
                                                setEditingEvent(event)
                                            }}
                                        >
                                            <Icon name="edit" />
                                            <span className="admin-event-action-label">Editar</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-event-action is-delete"
                                            aria-label={`Excluir evento ${event.title}`}
                                            title="Excluir evento"
                                            onClick={() => setEventPendingDeletion(event)}
                                        >
                                            <Icon name="trash" />
                                            <span className="admin-event-action-label">Excluir</span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="admin-events-empty">
                            {searchTerm.trim() || activeFilterCount > 0
                                ? 'Nenhum evento corresponde à busca e aos filtros selecionados.'
                                : 'Nenhum evento cadastrado.'}
                        </p>
                    )}
                    {!isLoading && hasMoreEvents && (
                        <div className="admin-events-pagination">
                            <button
                                className="admin-event-button is-secondary"
                                type="button"
                                aria-controls="admin-events-list"
                                onClick={() => setVisibleEventCount(count => count + EVENTS_PAGE_SIZE)}
                            >
                                Ver mais
                            </button>
                        </div>
                    )}
                </section>
            </section>

            {(isCreating || editingEvent) && (
                <AdminEventForm
                    key={editingEvent?.id ?? 'new-event'}
                    initialValues={editingEvent ? toFormValues(editingEvent) : { ...emptyForm, date: newEventDate }}
                    eventId={editingEvent?.id ?? null}
                    isSaving={isSaving}
                    error={formError}
                    onClose={closeForm}
                    onSubmit={saveEvent}
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
                            <Icon name="error" />
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

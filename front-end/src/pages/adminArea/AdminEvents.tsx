import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import {
    createAdminEvent,
    deleteAdminEvent,
    getAdminEventSchedule,
    recreateMonthlyFair,
    uploadEventBanner,
    updateAdminEvent,
    type AdminEventWithAuthor as AdminEvent,
    type AdminEventInput,
    type AdminEventSchedule,
} from '../../services/eventService'
import { getAdminProfile } from '../../services/authToken'
import { getUserFacingError } from '../../services/errors'
import { matchesEventTimeRange } from './eventTimeFilter'
import { EVENTS_PAGE_SIZE, formatEventDate, MONTH_OPTIONS } from './adminEventAgenda'
import AdminEventList from './AdminEventList'
import CreateEventButton from './CreateEventButton'
import './AdminEvents.css'
import '../../components/Calendar/CalendarStatus.css'
import AdminEventForm, { type EventFormValues, type EventSaveSession } from './AdminEventForm'
import { STATE_LABELS } from './eventFormLabels'
import { getCoordinates } from '../../utils/eventLocation'
import { MIN_FILTER_YEAR } from '../../utils/calendarYears'

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

type InitialEventAction =
    | { eventId: string; action: 'edit' | 'delete' }
    | { eventIds: string[]; label: string; action: 'filter' }

function getDateKey(value: string | Date): string {
    if (value instanceof Date) {
        const year = value.getFullYear()
        const month = String(value.getMonth() + 1).padStart(2, '0')
        const day = String(value.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
    return value.slice(0, 10)
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
    initialEventAction?: InitialEventAction | null
}) => {
    const [{ events, missingFairDates }, setSchedule] = useState<AdminEventSchedule>({ events: [], missingFairDates: [] })
    const [recreatingDate, setRecreatingDate] = useState<string | null>(null)
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
    const [issueFilter, setIssueFilter] = useState<{ eventIds: string[]; label: string } | null>(null)
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

    useEffect(() => {
        const controller = new AbortController()
        void getAdminEventSchedule(controller.signal)
            .then(schedule => {
                if (controller.signal.aborted) return
                setSchedule(schedule)

                if (!initialEventAction) return
                const requestKey = initialEventAction.action === 'filter'
                    ? `filter:${initialEventAction.eventIds.join(',')}`
                    : `${initialEventAction.action}:${initialEventAction.eventId}`
                if (handledInitialAction.current === requestKey) return
                handledInitialAction.current = requestKey

                if (initialEventAction.action === 'filter') {
                    setIssueFilter({ eventIds: initialEventAction.eventIds, label: initialEventAction.label })
                    setVisibleEventCount(EVENTS_PAGE_SIZE)
                    setActionMessage(null)
                    return
                }

                const requestedEvent = schedule.events.find(event => event.id === initialEventAction.eventId)
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
    }, [initialEventAction])

    const availableYears = useMemo(() => {
        const years = new Set([MIN_FILTER_YEAR])
        for (const event of events) {
            const year = Number(getDateKey(event.date).slice(0, 4))
            if (year >= MIN_FILTER_YEAR) years.add(year)
        }
        return [...years].sort((first, second) => second - first)
    }, [events])

    const availableAdministrators = useMemo(() => {
        const authors = new Map<string, { id: string; name: string; active: boolean }>()
        events.forEach(event => authors.set(event.administratorId ?? 'system', {
            id: event.administratorId ?? 'system',
            name: event.administratorName,
            active: event.administratorActive,
        }))
        return [...authors.values()].sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
    }, [events])

    const filteredEvents = useMemo(() => {
        const query = searchTerm.trim().toLocaleLowerCase('pt-BR')
        return events
            .filter(event => {
                const matchesSearch = !query || event.title.toLocaleLowerCase('pt-BR').includes(query)
                const matchesYear = !yearFilter || getDateKey(event.date).startsWith(yearFilter)
                const matchesMonth = !monthFilter || getDateKey(event.date).slice(5, 7) === monthFilter
                const matchesStatus = !statusFilter || event.state === statusFilter
                const eventWeekday = new Date(`${getDateKey(event.date)}T12:00:00`).getDay().toString()
                const matchesWeekday = !weekdayFilter || eventWeekday === weekdayFilter
                const matchesTime = matchesEventTimeRange(event, timeFromFilter, timeToFilter)
                const matchesAdministrator = !administratorFilter || (event.administratorId ?? 'system') === (
                    administratorFilter === 'mine' ? currentAdminId : administratorFilter
                )
                const matchesIssue = !issueFilter || issueFilter.eventIds.includes(event.id)
                return matchesSearch && matchesYear && matchesMonth && matchesStatus && matchesWeekday && matchesTime && matchesAdministrator && matchesIssue
            })
    }, [events, searchTerm, statusFilter, timeFromFilter, timeToFilter, weekdayFilter, yearFilter, monthFilter, administratorFilter, currentAdminId, issueFilter])

    const activeFilterCount = [statusFilter, yearFilter, monthFilter, weekdayFilter, timeFromFilter, timeToFilter, administratorFilter, issueFilter].filter(Boolean).length

    const clearFilters = () => {
        setVisibleEventCount(EVENTS_PAGE_SIZE)
        setStatusFilter('')
        setYearFilter('')
        setMonthFilter('')
        setWeekdayFilter('')
        setTimeFromFilter('')
        setTimeToFilter('')
        setAdministratorFilter('')
        setIssueFilter(null)
    }

    const closeForm = () => {
        if (isSaving) return
        setIsCreating(false)
        setNewEventDate('')
        setEditingEvent(null)
        setFormError(null)
    }

    const refreshSchedule = async () => {
        setIsLoading(true)
        setLoadError(null)
        try {
            setSchedule(await getAdminEventSchedule())
        } catch (error) {
            setLoadError(getUserFacingError(error, 'Não foi possível atualizar a agenda. Atualize a página para conferir.'))
        } finally {
            setIsLoading(false)
        }
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
                administratorId: editingEvent ? editingEvent.administratorId : currentAdmin!.id,
                administratorName: editingEvent?.administratorName ?? currentAdmin!.name,
                administratorActive: editingEvent?.administratorActive ?? Boolean(currentAdmin!.active),
            }
            setSchedule(current => ({
                ...current,
                missingFairDates: current.missingFairDates.filter(date => date !== savedEvent.date),
                events: current.events.some(event => event.id === savedEvent.id)
                    ? current.events.map(event => event.id === savedEvent.id ? savedEvent : event)
                    : [...current.events, savedEvent],
            }))
            await saveGallery(session.eventId)
            setActionMessage(editingEvent ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.')
            setIsCreating(false)
            setNewEventDate('')
            setEditingEvent(null)
            await refreshSchedule()
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
            setSchedule(current => ({ ...current, events: current.events.filter(item => item.id !== eventPendingDeletion.id) }))
            setEventPendingDeletion(null)
            setActionMessage('Evento excluído com sucesso.')
            await refreshSchedule()
        } catch (error) {
            setLoadError(getUserFacingError(error, 'Não foi possível excluir o evento.'))
        } finally {
            setIsDeleting(false)
        }
    }

    const recreateFair = async (date: string) => {
        if (recreatingDate) return
        setRecreatingDate(date)
        setActionMessage(null)
        setLoadError(null)
        try {
            const { created } = await recreateMonthlyFair(date)
            setActionMessage(created
                ? `Feira recriada para ${formatEventDate(date)}.`
                : `Já existe um evento em ${formatEventDate(date)}.`)
            setSchedule(current => ({ ...current, missingFairDates: current.missingFairDates.filter(item => item !== date) }))
            await refreshSchedule()
        } catch (error) {
            setLoadError(getUserFacingError(error, 'Não foi possível recriar a feira.'))
        } finally {
            setRecreatingDate(null)
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
                                        {admin.name}{admin.id !== 'system' && !admin.active ? ' (desativado)' : ''}
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
                {missingFairDates.length > 0 && (
                    <section className="admin-events-alert admin-events-missing-fairs" aria-labelledby="missing-fairs-title">
                        <h2 id="missing-fairs-title">Primeiros sábados sem evento</h2>
                        <ul>
                            {missingFairDates.map(date => (
                                <li key={date}>
                                    <time dateTime={date}>{formatEventDate(date)}</time>
                                    <button type="button" className="admin-event-button is-secondary"
                                        aria-label={`Recriar evento para ${formatEventDate(date)}`}
                                        disabled={recreatingDate !== null} onClick={() => void recreateFair(date)}>
                                        {recreatingDate === date ? 'Recriando…' : 'Recriar evento'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                {issueFilter && (
                    <p className="admin-events-issue-filter" role="status">
                        Exibindo os eventos com pendência: <strong>{issueFilter.label}</strong>.
                        <button type="button" onClick={() => setIssueFilter(null)}>Limpar filtro</button>
                    </p>
                )}

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
                        <AdminEventList
                            events={filteredEvents}
                            limit={visibleEventCount}
                            onShowMore={() => setVisibleEventCount(count => count + EVENTS_PAGE_SIZE)}
                            onEdit={event => {
                                setActionMessage(null)
                                setFormError(null)
                                setEditingEvent(event)
                            }}
                            onDelete={setEventPendingDeletion}
                        />
                    ) : (
                        <p className="admin-events-empty">
                            {searchTerm.trim() || activeFilterCount > 0
                                ? 'Nenhum evento corresponde à busca e aos filtros selecionados.'
                                : 'Nenhum evento cadastrado.'}
                        </p>
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

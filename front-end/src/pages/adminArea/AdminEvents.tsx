import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Icon from '../../components/Icon'
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

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${getDateKey(value)}T12:00:00`))
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
                    <button type="button" className="admin-event-modal-close" onClick={onClose} aria-label="Fechar" disabled={isSaving}>
                        <Icon name="close" />
                    </button>
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
                                        <Icon name="close" />
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
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<AdminEvent['state'] | ''>('')
    const [yearFilter, setYearFilter] = useState('')
    const [weekdayFilter, setWeekdayFilter] = useState('')
    const [timeFromFilter, setTimeFromFilter] = useState('')
    const [timeToFilter, setTimeToFilter] = useState('')
    const [newEventDate, setNewEventDate] = useState(initialEventDate ?? '')
    const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null)
    const [eventPendingDeletion, setEventPendingDeletion] = useState<AdminEvent | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCreating, setIsCreating] = useState(openCreateOnMount)
    const [isSaving, setIsSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const handledInitialAction = useRef<string | null>(null)

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

    useEffect(() => {
        if (!initialEventAction || isLoading) return

        const requestKey = `${initialEventAction.action}:${initialEventAction.eventId}`
        if (handledInitialAction.current === requestKey) return
        handledInitialAction.current = requestKey

        const requestedEvent = events.find(event => event.id === initialEventAction.eventId)
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
    }, [events, initialEventAction, isLoading])

    const availableYears = useMemo(
        () => [...new Set(events.map(event => getDateKey(event.date).slice(0, 4)))]
            .sort((first, second) => second.localeCompare(first)),
        [events],
    )

    const filteredEvents = useMemo(() => {
        const query = searchTerm.trim().toLocaleLowerCase('pt-BR')
        const now = new Date()
        const currentDateTime = `${getDateKey(now)}T${now.toTimeString().slice(0, 5)}`
        return events
            .filter(event => {
                const matchesSearch = !query || event.title.toLocaleLowerCase('pt-BR').includes(query)
                const matchesYear = !yearFilter || getDateKey(event.date).startsWith(yearFilter)
                const matchesStatus = !statusFilter || event.state === statusFilter
                const eventWeekday = new Date(`${getDateKey(event.date)}T12:00:00`).getDay().toString()
                const matchesWeekday = !weekdayFilter || eventWeekday === weekdayFilter
                const startsAt = event.startAt.slice(0, 5)
                const endsAt = event.endAt.slice(0, 5)
                const matchesTime = (!timeFromFilter || endsAt >= timeFromFilter)
                    && (!timeToFilter || startsAt <= timeToFilter)
                return matchesSearch && matchesYear && matchesStatus && matchesWeekday && matchesTime
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
    }, [events, searchTerm, statusFilter, timeFromFilter, timeToFilter, weekdayFilter, yearFilter])

    const activeFilterCount = [statusFilter, yearFilter, weekdayFilter, timeFromFilter, timeToFilter].filter(Boolean).length

    const clearFilters = () => {
        setStatusFilter('')
        setYearFilter('')
        setWeekdayFilter('')
        setTimeFromFilter('')
        setTimeToFilter('')
    }

    const closeForm = () => {
        if (isSaving) return
        setIsCreating(false)
        setNewEventDate('')
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
                                onChange={event => setSearchTerm(event.target.value)}
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
                            <Icon name="sliders" />
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
                            setNewEventDate(initialEventDate ?? '')
                            setIsCreating(true)
                        }}
                    >
                        <Icon name="plus" />
                        Criar Evento
                    </button>
                </div>

                {isFiltersOpen && (
                    <section className="admin-events-filters" id="admin-events-filters" aria-label="Filtros de eventos">
                        <label>
                            Ano
                            <select value={yearFilter} onChange={event => setYearFilter(event.target.value)}>
                                <option value="">Ver todos</option>
                                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </label>
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

                <section className="admin-events-agenda admin-events-all-list" aria-labelledby="admin-events-agenda-title">
                    <h2 id="admin-events-agenda-title">
                        {searchTerm.trim() || activeFilterCount > 0 ? 'Resultados dos eventos' : 'Todos os eventos'}
                    </h2>
                    {isLoading ? (
                        <p className="admin-events-empty" role="status">Carregando eventos...</p>
                    ) : filteredEvents.length ? (
                        <ul className="admin-events-list">
                            {filteredEvents.map(event => (
                                <li className="admin-event-card" key={event.id}>
                                    <div className="admin-event-title-row">
                                        <h3>{event.title}</h3>
                                        <span className={`admin-event-status is-${event.state.toLowerCase()}`}>{STATE_LABELS[event.state]}</span>
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
                                    <div className="admin-event-actions">
                                        <a
                                            className="admin-event-action is-view"
                                            href={`#/evento/${encodeURIComponent(event.id)}`}
                                            aria-label={`Ver evento ${event.title}`}
                                        >
                                            <Icon name="eye" />
                                            Ver Evento
                                        </a>
                                        <button
                                            type="button"
                                            className="admin-event-action is-edit"
                                            onClick={() => {
                                                setActionMessage(null)
                                                setFormError(null)
                                                setEditingEvent(event)
                                            }}
                                        >
                                            <Icon name="edit" />
                                            Editar
                                        </button>
                                        <button type="button" className="admin-event-action is-delete" onClick={() => setEventPendingDeletion(event)}>
                                            <Icon name="trash" />
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
                                : 'Nenhum evento cadastrado.'}
                        </p>
                    )}
                </section>
            </section>

            {(isCreating || editingEvent) && (
                <AdminEventForm
                    initialValues={editingEvent ? toFormValues(editingEvent) : { ...emptyForm, date: newEventDate }}
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

import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { getEvents, getEventDetails, type AdminEvent, type EventDetails, type EventImage } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import { getEventImageProps } from '../../services/eventImageUrl'
import { getAdjacentEvents, getEventReturnTarget } from './eventNavigation'
import { PREVIEW_SIZE, useEventGallery } from './useEventGallery'
import { getCoordinates, getDirectionsUrl } from '../../utils/eventLocation'
import '../../components/Calendar/CalendarStatus.css'
import './EventPage.css'

const LocationMap = lazy(() => import('../../components/Location/LocationMap'))

const EVENT_STATE_LABELS: Record<EventDetails['state'], string> = {
    PENDING: 'Agendado',
    HAPPENING: 'Em andamento',
    CONCLUDED: 'Concluído',
    CANCELED: 'Cancelado',
    RESCHEDULED: 'Reagendado',
}

function formatDate(value: string): string {
    const dateKey = value.slice(0, 10)
    const date = new Date(`${dateKey}T12:00:00`)
    if (Number.isNaN(date.getTime())) return 'Data não informada'

    return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date)
}

function formatTime(value: string): string {
    const time = value.slice(0, 5)
    return /^\d{2}:\d{2}$/.test(time) ? time : 'Horário não informado'
}

function EventPhoto({ image }: { image: EventImage }) {
    const [hasError, setHasError] = useState(false)
    const description = image.description.trim()

    return (
        <span className="event-page-photo">
            <span className="event-page-photo-frame">
                {hasError ? (
                    <span className="event-page-photo-unavailable" role="img" aria-label={description || 'Foto do evento'}>
                        Esta foto não está disponível.
                    </span>
                ) : (
                    <img
                        {...getEventImageProps(image.imageURL, 'auto, (max-width: 850px) 280px, 400px', 640)}
                        alt={description || 'Foto do evento'}
                        loading="lazy"
                        fetchPriority="low"
                        onError={() => setHasError(true)}
                    />
                )}
            </span>
            {description && <span className="event-page-photo-caption">{description}</span>}
        </span>
    )
}

function GalleryFeedback({ error, onRetry }: { error?: string; onRetry: () => void }) {
    return error ? (
        <div className="event-page-gallery-message is-error" role="alert">
            {error}
            <button type="button" className="event-page-gallery-more" onClick={onRetry}>Tentar novamente</button>
        </div>
    ) : (
        <div className="event-page-photo-frame event-page-gallery-message" role="status">Carregando fotos...</div>
    )
}

function EventPage({ eventId }: { eventId: string }) {
    const returnTarget = getEventReturnTarget()
    const [event, setEvent] = useState<EventDetails | null>(null)
    const [eventError, setEventError] = useState<string | null>(null)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [navigation, setNavigation] = useState<{
        events: AdminEvent[]; loading: boolean; error: boolean
    }>({ events: [], loading: true, error: false })

    useEffect(() => {
        if (!event) return
        const controller = new AbortController()
        void getEvents(controller.signal)
            .then(events => {
                if (!controller.signal.aborted) {
                    setNavigation({ events: events ?? [], loading: false, error: false })
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setNavigation({ events: [], loading: false, error: true })
                }
            })
        return () => controller.abort()
    }, [event])

    useEffect(() => {
        const controller = new AbortController()

        void getEventDetails(eventId, controller.signal)
            .then(eventDetails => {
                if (!controller.signal.aborted) setEvent(eventDetails)
            })
            .catch(requestError => {
                if (!controller.signal.aborted) {
                    setEventError(getUserFacingError(
                        requestError,
                        'Não foi possível carregar os dados do evento. Verifique sua conexão e tente novamente.',
                    ))
                }
            })
        return () => controller.abort()
    }, [eventId, reloadKey])

    const adjacentEvents = event ? getAdjacentEvents(navigation.events, event) : { previous: null, next: null }
    const isLoading = !event && !eventError
    const banner = event?.bannerImage?.trim()
    const bannerCount = banner ? 1 : 0
    const gallery = useEventGallery(event?.id, (selectedPhotoIndex ?? -1) - bannerCount)
    const photoCount = gallery.total + bannerCount
    const selectedPhoto = banner && selectedPhotoIndex === 0
        ? { imageURL: banner, description: 'Banner do evento' }
        : gallery.selectedPhoto
    const mapCoordinates = event ? getCoordinates(event.localLatitude, event.localLongitude) : null
    const hasAddress = Boolean(event?.localAddress?.trim())
    const mapUrl = getDirectionsUrl(mapCoordinates, event?.localAddress ?? null)
    const renderGalleryPhoto = (image: EventImage, index: number) => (
        <button
            key={image.id}
            className="event-page-photo-button"
            type="button"
            onClick={() => setSelectedPhotoIndex(index + bannerCount)}
            aria-label={`Ampliar foto ${index + 1} de ${gallery.total}`}
        >
            <EventPhoto image={image} />
        </button>
    )

    const movePhoto = useCallback((direction: -1 | 1) => {
        if (photoCount === 0) return
        setSelectedPhotoIndex((current) => {
            return current === null ? null : (current + direction + photoCount) % photoCount
        })
    }, [photoCount])

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedPhotoIndex(null)
            }
        }

        if (selectedPhotoIndex !== null) {
            window.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            window.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = ''
        }
    }, [selectedPhotoIndex])

    useEffect(() => {
        const handleKey = (event: KeyboardEvent) => {
            if (selectedPhotoIndex === null) return
            if (event.key === 'ArrowRight') movePhoto(1)
            if (event.key === 'ArrowLeft') movePhoto(-1)
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [selectedPhotoIndex, movePhoto])

    return (
        <>
            <Header initialActiveLink="/calendario" />
            <main className="event-page">
                <div className="event-page-content">
                    <div className="event-page-toolbar">
                        <a className="event-page-back" href={returnTarget.href} data-navigation-back>
                            <Icon name="arrowLeft" />
                            {returnTarget.label}
                        </a>
                        {!eventError && (
                            <nav className="event-page-navigation" aria-label="Navegar entre eventos">
                                {(['previous', 'next'] as const).map(direction => {
                                    const target = adjacentEvents[direction]
                                    const label = direction === 'previous' ? 'Evento anterior' : 'Próximo evento'
                                    const icon = direction === 'previous' ? 'arrowLeft' : 'arrowRight'
                                    const unavailable = navigation.loading ? 'Carregando eventos'
                                        : navigation.error ? 'Não foi possível carregar a navegação entre eventos'
                                            : direction === 'previous' ? 'Não há evento anterior' : 'Não há próximo evento'
                                    return target ? (
                                        <a key={direction} className="event-page-navigation-arrow"
                                            href={`/evento/${encodeURIComponent(target.id)}`}
                                            data-preserve-return
                                            aria-label={`${label}: ${target.title}`}
                                            title={`${label}: ${target.title} — ${formatDate(target.date)}, ${formatTime(target.startAt)}`}>
                                            <Icon name={icon} />
                                        </a>
                                    ) : (
                                        <button key={direction} type="button" className="event-page-navigation-arrow"
                                            disabled aria-label={`${label}: ${unavailable}`} title={unavailable}>
                                            <Icon name={icon} />
                                        </button>
                                    )
                                })}
                            </nav>
                        )}
                    </div>
                    {navigation.error && event && (
                        <p className="event-page-navigation-error" role="status">
                            Não foi possível carregar a navegação entre eventos.
                        </p>
                    )}

                    {isLoading && (
                        <section className="event-page-layout event-page-loading" role="status" aria-label="Carregando evento">
                            <div className="event-page-details-card">
                                <div className="event-page-title-row"><h1>Carregando evento...</h1></div>
                                <div className="event-page-loading-meta" aria-hidden="true" />
                                <div className="event-page-cover-empty" aria-hidden="true" />
                            </div>
                            <div className="event-page-gallery" aria-hidden="true">
                                <h2>Galeria de Fotos</h2>
                                <div className="event-page-photo-frame" />
                            </div>
                        </section>
                    )}

                    {eventError && (
                        <section className="event-page-feedback is-error" role="alert">
                            <span className="event-page-feedback-icon"><Icon name="error" /></span>
                            <h1>Não foi possível carregar este evento</h1>
                            <p>{eventError}</p>
                            <div className="event-page-feedback-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEventError(null)
                                        setReloadKey(key => key + 1)
                                    }}
                                >
                                    Tentar novamente
                                </button>
                                <a href={returnTarget.href} data-navigation-back>{returnTarget.label}</a>
                            </div>
                        </section>
                    )}

                    {event && (
                        <div className="event-page-layout">
                            <div className="event-page-main-column">
                                <article className="event-page-details-card">
                                    <div className="event-page-title-row">
                                        <h1>{event.title}</h1>
                                        <span className={`event-page-status calendar-status--${event.state}`}>
                                            {EVENT_STATE_LABELS[event.state]}
                                        </span>
                                    </div>

                                    <div className="event-page-meta">
                                        <div className="event-page-meta-item">
                                            <span className="event-page-meta-icon"><Icon name="calendar" /></span>
                                            <p>
                                                <strong>{formatDate(event.date)}</strong>
                                                <span>Data do evento</span>
                                            </p>
                                        </div>
                                        <div className="event-page-meta-item">
                                            <span className="event-page-meta-icon"><Icon name="clock" /></span>
                                            <p>
                                                <strong>{formatTime(event.startAt)} às {formatTime(event.endAt)}</strong>
                                                <span>Horário local</span>
                                            </p>
                                        </div>
                                        <div className="event-page-meta-item">
                                            <span className="event-page-meta-icon"><Icon name="location" /></span>
                                            <p>
                                                <strong>{hasAddress ? event.localAddress : 'Localização não informada'}</strong>
                                                <span>Local do evento</span>
                                            </p>
                                        </div>
                                    </div>

                                    {banner ? (
                                        <button
                                            type="button"
                                            className="event-page-cover-button"
                                            onClick={() => setSelectedPhotoIndex(0)}
                                            aria-label={`Ampliar imagem do evento ${event.title}`}
                                        >
                                            <img className="event-page-cover"
                                                {...getEventImageProps(banner, '(max-width: 680px) calc(100vw - 80px), (max-width: 850px) calc(52vw - 55px), (max-width: 1440px) calc(57vw - 73px), 750px')}
                                                width={780} height={400} loading="eager" fetchPriority="high" alt={event.title} />
                                        </button>
                                    ) : (
                                        <div className="event-page-cover-empty" role="status">
                                            Este evento não possui uma imagem de capa.
                                        </div>
                                    )}

                                    <section className="event-page-about">
                                        <h2>Sobre o Evento</h2>
                                        {event.description?.trim()
                                            ? <p>{event.description}</p>
                                            : <p className="event-page-missing-info">Este evento ainda não possui uma descrição.</p>}
                                    </section>
                                </article>

                                <section className="event-page-location" aria-labelledby="event-page-location-title">
                                    <div className={`event-page-map${mapCoordinates ? ' has-coordinates' : ''}`}>
                                        {mapCoordinates ? (
                                            <Suspense fallback={<p role="status">Carregando mapa...</p>}>
                                                <LocationMap coordinates={mapCoordinates} label={`Mapa de localização de ${event.title}`} />
                                            </Suspense>
                                        ) : (
                                            <p>
                                                {hasAddress
                                                    ? 'O mapa não está disponível para este evento.'
                                                    : 'A localização ainda não foi informada para este evento.'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="event-page-location-caption">
                                        <div>
                                            <h2 id="event-page-location-title">Como chegar?</h2>
                                            <p>{hasAddress ? event.localAddress : 'Localização não informada para este evento.'}</p>
                                        </div>
                                        {mapUrl && (
                                            <a href={mapUrl} target="_blank" rel="noreferrer">
                                                Traçar rota no Google Maps
                                                <Icon name="map" />
                                            </a>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <aside className="event-page-gallery" aria-labelledby="event-page-gallery-title">
                                <h2 id="event-page-gallery-title">Galeria de Fotos</h2>
                                {!gallery.preview || gallery.preview.error ? (
                                    <GalleryFeedback error={gallery.preview?.error} onRetry={gallery.retryVisible} />
                                ) : gallery.total === 0 ? (
                                    <p className="event-page-gallery-message">Esse evento não possui fotos.</p>
                                ) : (
                                    <>
                                        <div className="event-page-photos is-sidebar">
                                            {gallery.preview.images.map(renderGalleryPhoto)}
                                        </div>
                                        {gallery.total > PREVIEW_SIZE && (
                                            <button
                                                className="event-page-gallery-more"
                                                type="button"
                                                aria-expanded={gallery.expanded}
                                                onClick={gallery.expanded ? gallery.collapse : gallery.showMore}
                                            >
                                                {gallery.expanded ? 'Ver menos' : 'Ver mais'}
                                            </button>
                                        )}
                                    </>
                                )}
                            </aside>

                            {gallery.expanded && (
                                <section className="event-page-gallery-continuation" aria-label="Mais fotos do evento">
                                    <div className="event-page-photos">
                                        {gallery.extraPhotos.map((image, index) => renderGalleryPhoto(image, index + PREVIEW_SIZE))}
                                    </div>
                                    {!gallery.lastPage || gallery.lastPage.error ? (
                                        <GalleryFeedback error={gallery.lastPage?.error} onRetry={gallery.retryVisible} />
                                    ) : gallery.canShowMore && (
                                        <button className="event-page-gallery-more" type="button" onClick={gallery.showMore}>Ver mais</button>
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {selectedPhotoIndex !== null && (
                <div className="event-page-lightbox" role="dialog" aria-modal="true" aria-label="Visualização da foto do evento">
                    <button type="button" className="event-page-lightbox-close" onClick={() => setSelectedPhotoIndex(null)} aria-label="Fechar visualização da imagem">
                        <Icon name="close" />
                    </button>

                    <button type="button" className="event-page-lightbox-nav is-prev" disabled={photoCount < 2} onClick={() => movePhoto(-1)} aria-label="Foto anterior">
                        <Icon name="arrowLeft" />
                    </button>

                    <div className="event-page-lightbox-panel">
                        {selectedPhoto ? (
                            <>
                                <img {...getEventImageProps(selectedPhoto.imageURL, '(max-width: 680px) calc(100vw - 56px), (max-width: 1140px) calc(100vw - 216px), 940px', 1280)} alt={selectedPhoto.description || 'Foto do evento'} />
                                {selectedPhoto.description && <p>{selectedPhoto.description}</p>}
                            </>
                        ) : gallery.selectedMissing ? (
                            <p role="status">Esta foto não está mais na galeria.</p>
                        ) : <GalleryFeedback error={gallery.selectedError} onRetry={gallery.retrySelected} />}
                    </div>

                    <button type="button" className="event-page-lightbox-nav is-next" disabled={photoCount < 2} onClick={() => movePhoto(1)} aria-label="Próxima foto">
                        <Icon name="arrowRight" />
                    </button>
                </div>
            )}

            <Footer />
        </>
    )
}

export default EventPage

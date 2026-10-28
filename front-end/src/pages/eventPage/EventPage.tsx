import { useCallback, useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { getEvents, getEventDetails, getEventImages, type AdminEvent, type EventDetails, type EventImage } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
import { getEventImageProps } from '../../services/eventImageUrl'
import { getAdjacentEvents } from './eventNavigation'
import './EventPage.css'

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

function getMapCoordinates(event: EventDetails): { latitude: number; longitude: number } | null {
    const latitude = Number(event.localLatitude)
    const longitude = Number(event.localLongitude)
    if (
        event.localLatitude === null || event.localLatitude === ''
        || event.localLongitude === null || event.localLongitude === ''
        || !Number.isFinite(latitude) || !Number.isFinite(longitude)
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
        return null
    }

    return { latitude, longitude }
}

function EventPhoto({ image }: { image: EventImage }) {
    const [hasError, setHasError] = useState(false)
    const description = image.description.trim()

    return (
        <figure className="event-page-photo">
            {hasError ? (
                <div className="event-page-photo-unavailable" role="img" aria-label={description || 'Foto do evento'}>
                    <span>Esta foto não está disponível.</span>
                </div>
            ) : (
                <img
                    {...getEventImageProps(image.imageURL, '(max-width: 420px) calc(100vw - 80px), (max-width: 680px) 44vw, 320px', 640)}
                    alt={description || 'Foto do evento'}
                    loading="lazy"
                    onError={() => setHasError(true)}
                />
            )}
            {description && <figcaption>{description}</figcaption>}
        </figure>
    )
}

function EventPage({ eventId }: { eventId: string }) {
    const [event, setEvent] = useState<EventDetails | null>(null)
    const [images, setImages] = useState<EventImage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [eventError, setEventError] = useState<string | null>(null)
    const [imagesError, setImagesError] = useState<string | null>(null)
    const [showAllPhotos, setShowAllPhotos] = useState(false)
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [navigation, setNavigation] = useState<{
        events: AdminEvent[]; loading: boolean; error: boolean
    }>({ events: [], loading: true, error: false })

    useEffect(() => {
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
    }, [eventId, reloadKey])

    useEffect(() => {
        const controller = new AbortController()

        const loadEvent = async () => {
            try {
                const eventDetails = await getEventDetails(eventId, controller.signal)
                if (controller.signal.aborted) return
                setEvent(eventDetails)

                try {
                    const eventImages = await getEventImages(eventId, controller.signal)
                    if (!controller.signal.aborted) setImages(eventImages ?? [])
                } catch (requestError) {
                    if (!controller.signal.aborted) {
                        setImagesError(getUserFacingError(
                            requestError,
                            'Não foi possível carregar as fotos deste evento. Tente novamente mais tarde.',
                        ))
                    }
                }
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    setEventError(getUserFacingError(
                        requestError,
                        'Não foi possível carregar os dados do evento. Verifique sua conexão e tente novamente.',
                    ))
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }

        void loadEvent()
        return () => controller.abort()
    }, [eventId, reloadKey])

    const adjacentEvents = event ? getAdjacentEvents(navigation.events, event) : { previous: null, next: null }
    const galleryImages = images.filter(image =>
        image.imageURL.trim() && image.description.trim().toLocaleLowerCase('pt-BR') !== 'banner do evento',
    )
    const photos = galleryImages.length > 0
        ? galleryImages
        : event?.bannerImage?.trim()
            ? [{ id: 'event-banner', imageURL: event.bannerImage, description: 'Imagem do evento' }]
            : []
    const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 5)
    const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] ?? null : null
    const mapCoordinates = event ? getMapCoordinates(event) : null
    const hasAddress = Boolean(event?.localAddress?.trim())
    const mapUrl = mapCoordinates
        ? `https://www.openstreetmap.org/?mlat=${mapCoordinates.latitude}&mlon=${mapCoordinates.longitude}#map=16/${mapCoordinates.latitude}/${mapCoordinates.longitude}`
        : null
    const mapEmbedUrl = mapCoordinates
        ? `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({
            bbox: [
                mapCoordinates.longitude - 0.01,
                mapCoordinates.latitude - 0.01,
                mapCoordinates.longitude + 0.01,
                mapCoordinates.latitude + 0.01,
            ].join(','),
            layer: 'mapnik',
            marker: `${mapCoordinates.latitude},${mapCoordinates.longitude}`,
        })}`
        : null

    const openPhoto = (index: number) => {
        if (photos.length === 0) return
        setSelectedPhotoIndex((index + photos.length) % photos.length)
    }

    const photoCount = photos.length
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
            <Header initialActiveLink="#/calendario" />
            <main className="event-page">
                <div className="event-page-content">
                    <div className="event-page-toolbar">
                        <a className="event-page-back" href="#/calendario">
                            <Icon name="arrowLeft" />
                            Voltar para o Calendário
                        </a>
                        {!isLoading && !eventError && event && (
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
                                            href={`#/evento/${encodeURIComponent(target.id)}`}
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
                    {navigation.error && !isLoading && !eventError && (
                        <p className="event-page-navigation-error" role="status">
                            Não foi possível carregar a navegação entre eventos.
                        </p>
                    )}

                    {isLoading && (
                        <section className="event-page-feedback" role="status">
                            <span className="event-page-feedback-icon" aria-hidden="true">
                                <Icon name="calendar" />
                            </span>
                            <h1>Carregando evento...</h1>
                            <p>Estamos buscando os detalhes para você.</p>
                        </section>
                    )}

                    {!isLoading && eventError && (
                        <section className="event-page-feedback is-error" role="alert">
                            <span className="event-page-feedback-icon"><Icon name="error" /></span>
                            <h1>Não foi possível carregar este evento</h1>
                            <p>{eventError}</p>
                            <div className="event-page-feedback-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEvent(null)
                                        setImages([])
                                        setEventError(null)
                                        setImagesError(null)
                                        setIsLoading(true)
                                        setShowAllPhotos(false)
                                        setReloadKey(key => key + 1)
                                    }}
                                >
                                    Tentar novamente
                                </button>
                                <a href="#/calendario">Voltar para o Calendário</a>
                            </div>
                        </section>
                    )}

                    {!isLoading && !eventError && event && (
                        <>
                            <div className="event-page-layout">
                                <article className="event-page-details-card">
                                    <div className="event-page-title-row">
                                        <h1>{event.title}</h1>
                                        <span className={`event-page-status is-${event.state.toLowerCase()}`}>
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

                                    {event.bannerImage?.trim() ? (
                                        <button
                                            type="button"
                                            className="event-page-cover-button"
                                            onClick={() => openPhoto(photos.findIndex(photo => photo.id === 'event-banner') >= 0 ? photos.findIndex(photo => photo.id === 'event-banner') : 0)}
                                            aria-label={`Ampliar imagem do evento ${event.title}`}
                                        >
                                            <img className="event-page-cover" {...getEventImageProps(event.bannerImage, '(max-width: 680px) calc(100vw - 80px), (max-width: 1200px) 60vw, 760px')} alt={event.title} />
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

                                <aside className="event-page-gallery" aria-labelledby="event-page-gallery-title">
                                    <h2 id="event-page-gallery-title">Galeria de Fotos</h2>
                                    {imagesError ? (
                                        <p className="event-page-gallery-message is-error" role="alert">{imagesError}</p>
                                    ) : photos.length === 0 ? (
                                        <p className="event-page-gallery-message">Esse evento não possui fotos.</p>
                                    ) : (
                                        <>
                                            <div className="event-page-photos">
                                                {visiblePhotos.map((image, index) => (
                                                    <div
                                                        key={image.id}
                                                        className="event-page-photo-button"
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => openPhoto(photos.findIndex(photo => photo.id === image.id))}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter' || event.key === ' ') {
                                                                event.preventDefault()
                                                                openPhoto(photos.findIndex(photo => photo.id === image.id))
                                                            }
                                                        }}
                                                        aria-label={`Ampliar foto ${index + 1} de ${visiblePhotos.length}`}
                                                    >
                                                        <EventPhoto image={image} />
                                                    </div>
                                                ))}
                                            </div>
                                            {photos.length > 5 && (
                                                <button
                                                    className="event-page-gallery-more"
                                                    type="button"
                                                    onClick={() => setShowAllPhotos(current => !current)}
                                                >
                                                    {showAllPhotos ? 'Ver menos' : 'Ver mais'}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </aside>
                            </div>

                            <section className="event-page-location" aria-labelledby="event-page-location-title">
                                <div className="event-page-map">
                                    {mapEmbedUrl ? (
                                        <iframe
                                            title={`Mapa de localização de ${event.title}`}
                                            src={mapEmbedUrl}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
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
                                            Abrir no mapa
                                            <Icon name="map" />
                                        </a>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>

            {selectedPhoto && (
                <div className="event-page-lightbox" role="dialog" aria-modal="true" aria-label="Visualização da foto do evento">
                    <button type="button" className="event-page-lightbox-close" onClick={() => setSelectedPhotoIndex(null)} aria-label="Fechar visualização da imagem">
                        <Icon name="close" />
                    </button>

                    <button type="button" className="event-page-lightbox-nav is-prev" onClick={() => movePhoto(-1)} aria-label="Foto anterior">
                        <Icon name="arrowLeft" />
                    </button>

                    <div className="event-page-lightbox-panel">
                        <img {...getEventImageProps(selectedPhoto.imageURL, '(max-width: 680px) calc(100vw - 56px), (max-width: 1400px) 90vw, 1200px', 2560)} alt={selectedPhoto.description || 'Foto do evento'} />
                        {selectedPhoto.description && <p>{selectedPhoto.description}</p>}
                    </div>

                    <button type="button" className="event-page-lightbox-nav is-next" onClick={() => movePhoto(1)} aria-label="Próxima foto">
                        <Icon name="arrowRight" />
                    </button>
                </div>
            )}

            <Footer />
        </>
    )
}

export default EventPage

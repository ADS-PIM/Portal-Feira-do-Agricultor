import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { getEventDetails, getEventImages, type EventDetails, type EventImage } from '../../services/eventService'
import { getUserFacingError } from '../../services/errors'
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
                    src={image.imageURL}
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
    const [reloadKey, setReloadKey] = useState(0)

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

    const galleryImages = images.filter(image =>
        image.imageURL.trim() && image.description.trim().toLocaleLowerCase('pt-BR') !== 'banner do evento',
    )
    const photos = galleryImages.length > 0
        ? galleryImages
        : event?.bannerImage?.trim()
            ? [{ id: 'event-banner', imageURL: event.bannerImage, description: 'Imagem do evento' }]
            : []
    const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 5)
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

    return (
        <>
            <Header initialActiveLink="#/calendario" />
            <main className="event-page">
                <div className="event-page-content">
                    <a className="event-page-back" href="#/calendario">
                        <Icon name="arrowLeft" />
                        Voltar para o Calendário
                    </a>

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
                                        <img className="event-page-cover" src={event.bannerImage} alt={event.title} />
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
                                                {visiblePhotos.map(image => <EventPhoto key={image.id} image={image} />)}
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
            <Footer />
        </>
    )
}

export default EventPage

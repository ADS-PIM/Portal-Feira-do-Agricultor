import './NearestEventPainel.css'
import Icon from '../Icon'
import type { NearestEvent } from '../../services/eventService'
import { getEventImageProps } from '../../services/eventImageUrl'

interface NearestEventPainelProps {
    event: NearestEvent | null
}

const formatDate = (value: string) => {
    const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!dateParts) return value
    const [, year, month, day] = dateParts
    return `${day}/${month}/${year}`
}

const formatTime = (value: string) => `${value.slice(0, 5)}h`

const NearestEventPainel = ({ event }: NearestEventPainelProps) => {
    if (!event) return (
        <div className="featured-event-empty" role="status">
            <Icon name="seedling" />
            <h3>Nenhum evento programado por enquanto</h3>
            <p>Estamos preparando novos encontros. Volte em breve para descobrir a próxima feira.</p>
        </div>
    )

    return (
        <article className="nearest-event-painel" aria-labelledby="featured-event-title">
            <div className={`featured-event-image${event.bannerImage ? '' : ' is-missing'}`}>
                {event.bannerImage
                    ? <img {...getEventImageProps(event.bannerImage, '(max-width: 560px) 100vw, 240px')} alt={event.title} />
                    : <><Icon name="calendar" /><p>Evento sem banner</p></>}
            </div>
            <div className="featured-event-info">
                <p className="featured-event-eyebrow">Próximo encontro</p>
                <h3 id="featured-event-title">{event.title}</h3>
                {event.description && <p className="featured-event-description" tabIndex={0}>{event.description}</p>}
                <dl className="featured-event-details">
                    <div>
                        <dt><Icon name="location" /><span>Endereço</span></dt>
                        <dd>{event.localAddress}</dd>
                    </div>
                    <div>
                        <dt><Icon name="calendar" /><span>Data</span></dt>
                        <dd><time dateTime={event.date.slice(0, 10)}>{formatDate(event.date)}</time></dd>
                    </div>
                    <div>
                        <dt><Icon name="clock" /><span>Horário</span></dt>
                        <dd>{formatTime(event.startAt)} às {formatTime(event.endAt)}</dd>
                    </div>
                </dl>
                <a className="featured-event-details-link" href={`/evento/${encodeURIComponent(event.id)}`}>
                    Ver detalhes <Icon name="arrowRight" />
                </a>
            </div>
        </article>
    )
}

export default NearestEventPainel

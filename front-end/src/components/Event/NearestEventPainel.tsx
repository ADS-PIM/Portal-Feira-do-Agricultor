import './NearestEventPainel.css'
import Icon from '../Icon'
import type { NearestEvent } from '../../services/eventService'

interface NearestEventPainelProps {
    event: NearestEvent | null
}

const formatDate = (value: string) => {
    const dateParts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!dateParts) return value

    const [, year, month, day] = dateParts
    return `${day}/${month}/${year}`
}

const formatTime = (value: string) => {
    const timeParts = /^(\d{1,2}):(\d{2})/.exec(value)
    if (!timeParts) return value

    const [, hours, minutes] = timeParts
    return `${hours.padStart(2, '0')}:${minutes}h`
}

const NearestEventPainel = ({ event }: NearestEventPainelProps) => {
    return (
        <section id={event?.id} className={`nearest-event-painel${event ? '' : ' is-empty'}`}>
            <div className='panel-header'>
                <h2>Próximo Evento</h2>
                <p>Venha nos visitar</p>
            </div>
            {event ? (
                <div className='panel-body'>
                    <div className={`event-image${event.bannerImage ? '' : ' is-missing'}`}>
                        {event.bannerImage
                            ? <img src={event.bannerImage} alt={event.title} />
                            : <p>Evento sem banner</p>}
                    </div>
                    <div className='event-info'>
                        <h3>{event.title}</h3>
                        {event.description && <p className='event-description' tabIndex={0}>{event.description}</p>}
                        <div className='event-details'>
                            <div className='event-detail'>
                                <span className='event-detail-icon' aria-hidden='true'>
                                    <Icon name="location" />
                                </span>
                                <p><strong>Endereço Completo</strong><span>{event.localAddress}</span></p>
                            </div>
                            <div className='event-detail'>
                                <span className='event-detail-icon' aria-hidden='true'>
                                    <Icon name="calendar" />
                                </span>
                                <p><strong>Data</strong><span>{formatDate(event.date)}</span></p>
                            </div>
                            <div className='event-detail'>
                                <span className='event-detail-icon' aria-hidden='true'>
                                    <Icon name="clock" />
                                </span>
                                <p><strong>Horário</strong><span>{formatTime(event.startAt)} - {formatTime(event.endAt)}</span></p>
                            </div>
                        </div>
                        <div className='event-actions'>
                            <a href={`#/evento/${encodeURIComponent(event.id)}`}>
                                Ver detalhes
                                <Icon name="arrowRight" />
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='event-empty-state' role='status'>
                    <div className='event-empty-icon' aria-hidden='true'>
                        <Icon name="seedling" />
                    </div>
                    <h3>Nenhum evento programado por enquanto</h3>
                    <p>Estamos preparando novos encontros. Volte em breve para descobrir a próxima feira.</p>
                </div>
            )}
        </section>
    )
}

export default NearestEventPainel
import './NearestEventPainel.css'
import type { NearestEvent } from '../services/eventService'

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
                        {event.description && <p className='event-description'>{event.description}</p>}
                        <div className='event-details'>
                            <div className='event-detail'>
                                <span className='event-detail-icon' aria-hidden='true'>
                                    <svg viewBox='0 0 24 24' fill='none'>
                                        <path d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z' />
                                        <circle cx='12' cy='10' r='2.5' />
                                    </svg>
                                </span>
                                <p><strong>Endereço Completo</strong><span>{event.localAddress}</span></p>
                            </div>
                            <div className='event-detail'>
                                <span className='event-detail-icon' aria-hidden='true'>
                                    <svg viewBox='0 0 24 24' fill='none'>
                                        <rect x='4' y='6' width='16' height='15' rx='2' />
                                        <path d='M8 3v6M16 3v6M4 10h16' />
                                    </svg>
                                </span>
                                <p><strong>Data</strong><span>{formatDate(event.date)}</span></p>
                            </div>
                            <div className='event-detail'>
                                <span className='event-detail-icon' aria-hidden='true'>
                                    <svg viewBox='0 0 24 24' fill='none'>
                                        <circle cx='12' cy='12' r='9' />
                                        <path d='M12 7v5l3 2' />
                                    </svg>
                                </span>
                                <p><strong>Horário</strong><span>{formatTime(event.startAt)} - {formatTime(event.endAt)}</span></p>
                            </div>
                        </div>
                        <div className='event-actions'>
                            <button type='button'>
                                Ver detalhes
                                <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                                    <path d='M5 12h14M13 6l6 6-6 6' />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='event-empty-state' role='status'>
                    <div className='event-empty-icon' aria-hidden='true'>
                        <svg viewBox='0 0 64 64' fill='none'>
                            <rect x='11' y='15' width='42' height='38' rx='7' />
                            <path d='M21 9v12M43 9v12M11 27h42' />
                            <path d='M25 40c0-5 4-9 9-9 0 5-4 9-9 9Zm0 0c0 5 4 9 9 9' />
                        </svg>
                    </div>
                    <h3>Nenhum evento programado por enquanto</h3>
                    <p>Estamos preparando novos encontros. Volte em breve para descobrir a próxima feira.</p>
                </div>
            )}
        </section>
    )
}

export default NearestEventPainel
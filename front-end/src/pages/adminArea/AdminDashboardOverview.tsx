import { useEffect, useState } from 'react'
import Icon, { type IconName } from '../../components/Icon'
import type { AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import type { AdminRecord } from '../../services/adminService'
import type { AdminEvent } from '../../services/eventService'
import type { UserMessage } from '../../services/messageService'
import { getDashboardMetrics } from './dashboardMetrics'
import './AdminDashboardOverview.css'

export type DashboardFailures = { admins: boolean; events: boolean; messages: boolean }

export default function AdminDashboardOverview({ admins, events, messages, isLoading, failures, onSelectSection, onCreateEvent, onEditEvent }: {
    admins: AdminRecord[]
    events: AdminEvent[]
    messages: UserMessage[]
    isLoading: boolean
    failures: DashboardFailures
    onSelectSection: (section: AdminSection) => void
    onCreateEvent: () => void
    onEditEvent: (id: string) => void
}) {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000)
        return () => window.clearInterval(timer)
    }, [])
    const metrics = getDashboardMetrics(events, now)
    const unread = messages.filter(message => !message.isRead).length
    const activeAdmins = admins.filter(admin => admin.active).length
    const next = metrics.nextEvent
    const cards: { label: string; value: number; detail: string; icon: IconName; section: AdminSection; action: string; tone: string; failed: boolean }[] = [
        { label: 'Eventos cadastrados', value: events.length, detail: 'Total da agenda, em todos os status', icon: 'calendar', section: 'eventos', action: 'Gerenciar eventos', tone: 'green', failed: failures.events },
        { label: 'Próximos 30 dias', value: metrics.next30Days, detail: `${metrics.upcomingCount} eventos futuros na agenda`, icon: 'clock', section: 'eventos', action: 'Consultar agenda', tone: 'orange', failed: failures.events },
        { label: 'Mensagens não lidas', value: unread, detail: `${messages.length} recebidas · ${messages.length - unread} lidas`, icon: 'message', section: 'mensagens', action: 'Abrir mensagens', tone: 'blue', failed: failures.messages },
        { label: 'Administradores ativos', value: activeAdmins, detail: `${admins.length} cadastrados · ${admins.length - activeAdmins} inativos`, icon: 'userShield', section: 'administradores', action: 'Gerenciar equipe', tone: 'purple', failed: failures.admins },
    ]
    const eventsUnavailable = isLoading || failures.events
    const eventFeedback = isLoading ? 'Carregando agenda...' : 'Os dados da agenda estão indisponíveis.'

    return (
        <section className="dashboard-overview" aria-label="Visão geral do site" aria-busy={isLoading}>
            <div className="dashboard-overview-heading">
                <div><span className="dashboard-eyebrow">VISÃO GERAL</span><h2>Seu portal em números</h2><p>Organize a agenda e acompanhe o que precisa de atenção.</p></div>
                <button type="button" className="dashboard-create" onClick={onCreateEvent}><Icon name="plus" /> Novo evento</button>
            </div>
            <div className="dashboard-metrics">
                {cards.map(card => (
                    <article className={`dashboard-metric is-${card.tone}`} key={card.label}>
                        <div className="dashboard-metric-heading"><h3>{card.label}</h3><span className="dashboard-metric-icon"><Icon name={card.icon} /></span></div>
                        <strong className="dashboard-metric-value">{isLoading ? '…' : card.failed ? '—' : card.value}</strong>
                        <p>{isLoading ? 'Carregando dados...' : card.failed ? 'Dados indisponíveis' : card.detail}</p>
                        <button type="button" className="dashboard-text-action" onClick={() => onSelectSection(card.section)}>{card.action}<Icon name="arrowRight" /></button>
                    </article>
                ))}
            </div>
            <div className="dashboard-insights">
                <article className="dashboard-next-event">
                    <div className="dashboard-panel-heading"><h3><Icon name="seedling" /> Próximo evento</h3><span className="dashboard-tag">Na agenda</span></div>
                    {eventsUnavailable ? <p role="status">{eventFeedback}</p> : next ? (
                        <>
                            <div className="dashboard-next-main">
                                <div className="dashboard-date-tile"><strong>{next.date.slice(8, 10)}</strong><span>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${next.date.slice(0, 10)}T12:00:00`))}</span></div>
                                <div><h4>{next.title}</h4><p>{new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${next.date.slice(0, 10)}T12:00:00`))}</p><p>{next.startAt.slice(0, 5)} às {next.endAt.slice(0, 5)}</p></div>
                            </div>
                            <p className="dashboard-next-location"><Icon name="location" />{next.localAddress || 'Local não informado'}</p>
                            <a className="dashboard-next-link" href={`#/evento/${encodeURIComponent(next.id)}`}>Ver evento<Icon name="arrowRight" /></a>
                        </>
                    ) : <div className="dashboard-next-empty"><h4>Espaço para a próxima feira</h4><p>Nenhum evento futuro agendado. Crie um evento para atualizar a programação do portal.</p><button type="button" className="dashboard-next-link" onClick={onCreateEvent}>Criar evento<Icon name="plus" /></button></div>}
                </article>
                <article className="dashboard-status-panel">
                    <div className="dashboard-panel-heading"><h3>Situação da agenda</h3><span className="dashboard-panel-caption">Todos os eventos</span></div>
                    {eventsUnavailable ? <p role="status">{eventFeedback}</p> : <>
                        <div className="dashboard-status-bar" aria-hidden="true">{metrics.states.filter(item => item.count > 0).map(item => <span key={item.state} className={`is-${item.state.toLowerCase()}`} style={{ flex: item.count }} />)}</div>
                        <ul className="dashboard-status-legend">{metrics.states.map(item => <li key={item.state}><span className={`dashboard-status-dot is-${item.state.toLowerCase()}`} /><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul>
                        {events.length === 0 && <p className="dashboard-panel-caption">Nenhum evento cadastrado ainda.</p>}
                    </>}
                </article>
                <article className="dashboard-quality-panel">
                    <div className="dashboard-panel-heading"><h3><Icon name="edit" /> Revisão de conteúdo</h3></div>
                    <p className="dashboard-panel-caption">Confira os eventos futuros antes da divulgação.</p>
                    {eventsUnavailable ? <p role="status">{eventFeedback}</p> : <>
                        {([
                            { label: 'Sem imagem de capa', items: metrics.missingCover, icon: 'image' },
                            { label: 'Sem descrição', items: metrics.missingDescription, icon: 'message' },
                        ] as const).map(item => <button type="button" className="dashboard-quality-item" key={item.label} disabled={!item.items.length} onClick={() => onEditEvent(item.items[0].id)} aria-label={`${item.label}: ${item.items.length}${item.items.length ? `. Revisar ${item.items[0].title}` : ''}`}><Icon name={item.icon} /><span>{item.label}</span><strong>{item.items.length}</strong><Icon name="chevronRight" /></button>)}
                        <p className="dashboard-quality-note">{metrics.missingCover.length || metrics.missingDescription.length ? 'Selecione um item para revisar o evento mais próximo.' : metrics.upcomingCount ? 'Tudo pronto: os eventos futuros têm capa e descrição.' : 'Os próximos eventos aparecerão aqui para revisão.'}</p>
                    </>}
                </article>
            </div>
        </section>
    )
}

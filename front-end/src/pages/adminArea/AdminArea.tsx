import { useEffect, useState } from 'react'
import AdminSideNav, { type AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import Icon from '../../components/Icon'
import AdminUsersMessages from './AdminUsersMessages'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { restoreAdminProfile } from '../../services/api'
import { getUserFacingError } from '../../services/errors'
import AdminBusinessInfo from './AdminBusinessInfo'
import AdminDashboard from './AdminDashboard'
import AdminEvents from './AdminEvents'
import AdminAdministrators from './AdminAdministrators'
import './AdminArea.css'

const AdminAccessSkeleton = () => (
    <main className="admin-area admin-area-checking" aria-label="Verificação de acesso administrativo" aria-busy="true">
        <p className="admin-area-skeleton-status" role="status">Verificando acesso administrativo...</p>
        <aside className="admin-area-skeleton-nav" aria-hidden="true">
            <nav>
                <ul className="admin-area-skeleton-nav-list">
                    {Array.from({ length: 5 }, (_, index) => (
                        <li className={`admin-area-skeleton-nav-item${index === 0 ? ' is-active' : ''}`} key={index}>
                            <span className="admin-area-skeleton-nav-icon" />
                            <span className="admin-area-skeleton-block is-nav-label" />
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
        <section className="admin-area-content admin-area-skeleton-content" aria-hidden="true">
            <div className="admin-dashboard-page">
                <header className="admin-dashboard-header">
                    <span className="admin-area-skeleton-block is-title" />
                    <span className="admin-area-skeleton-block is-subtitle" />
                </header>
                <div className="admin-dashboard-workspace">
                    <div className="dashboard-overview">
                        <div className="dashboard-overview-heading">
                            <div className="admin-area-skeleton-intro">
                                <span className="admin-area-skeleton-block is-eyebrow" />
                                <span className="admin-area-skeleton-block is-overview-title" />
                                <span className="admin-area-skeleton-block is-overview-description" />
                            </div>
                            <span className="admin-area-skeleton-block is-create-button" />
                        </div>
                        <div className="dashboard-metrics">
                            {Array.from({ length: 4 }, (_, index) => (
                                <div className="dashboard-metric" key={index}>
                                    <div className="dashboard-metric-heading">
                                        <span className="admin-area-skeleton-block is-card-label" />
                                        <span className="admin-area-skeleton-block is-metric-icon" />
                                    </div>
                                    <span className="admin-area-skeleton-block is-card-value" />
                                    <span className="admin-area-skeleton-block is-card-detail" />
                                    <div className="admin-area-skeleton-card-footer">
                                        <span className="admin-area-skeleton-block is-card-action" />
                                        <span className="admin-area-skeleton-block is-action-icon" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="dashboard-insights">
                            <article className="dashboard-next-event admin-area-skeleton-insight">
                                <span className="admin-area-skeleton-block is-panel-title" />
                                <div className="dashboard-next-main">
                                    <span className="admin-area-skeleton-block is-date-tile" />
                                    <div className="admin-area-skeleton-event-info">
                                        <span className="admin-area-skeleton-block is-panel-title" />
                                        <span className="admin-area-skeleton-block is-card-detail" />
                                        <span className="admin-area-skeleton-block is-card-label" />
                                    </div>
                                </div>
                                <span className="admin-area-skeleton-block is-card-label" />
                                <span className="admin-area-skeleton-block is-card-action" />
                            </article>
                            <article className="admin-area-skeleton-insight">
                                <span className="admin-area-skeleton-block is-panel-title" />
                                <span className="admin-area-skeleton-block is-status-bar" />
                                <div className="dashboard-status-legend">
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <div className="admin-area-skeleton-legend-row" key={index}>
                                            <span className="admin-area-skeleton-block is-card-label" />
                                            <span className="admin-area-skeleton-block is-action-icon" />
                                        </div>
                                    ))}
                                </div>
                            </article>
                            <article className="admin-area-skeleton-insight">
                                <span className="admin-area-skeleton-block is-panel-title" />
                                <span className="admin-area-skeleton-block is-card-detail" />
                                <span className="admin-area-skeleton-block is-quality-row" />
                                <span className="admin-area-skeleton-block is-quality-row" />
                                <span className="admin-area-skeleton-block is-card-detail" />
                            </article>
                        </div>
                    </div>
                    <div className="admin-events admin-events-columns admin-dashboard-agenda">
                        <section className="admin-events-calendar">
                            <header className="admin-events-calendar-header">
                                <span className="admin-area-skeleton-block is-calendar-heading" />
                                <span className="admin-area-skeleton-block is-calendar-navigation" />
                            </header>
                            <div className="admin-events-calendar-grid">
                                {Array.from({ length: 49 }, (_, index) => (
                                    <span className={`admin-area-skeleton-block is-calendar-cell${index < 7 ? ' is-weekday' : ''}`} key={index} />
                                ))}
                            </div>
                        </section>
                        <section className="admin-events-agenda admin-dashboard-agenda-list">
                            <header className="admin-dashboard-agenda-header">
                                <span className="admin-area-skeleton-block is-agenda-heading" />
                            </header>
                            <div className="admin-area-skeleton-agenda-list">
                                {Array.from({ length: 4 }, (_, index) => (
                                    <div className="admin-event-card admin-area-skeleton-agenda-card" key={index}>
                                        <span className="admin-area-skeleton-block is-agenda-meta" />
                                        <span className="admin-area-skeleton-block is-agenda-title" />
                                        <span className="admin-area-skeleton-block is-agenda-detail" />
                                        <span className="admin-area-skeleton-block is-agenda-detail is-short" />
                                        <span className="admin-area-skeleton-block is-agenda-detail is-short" />
                                        <div className="admin-event-actions">
                                            {Array.from({ length: 3 }, (_, actionIndex) => (
                                                <span className="admin-area-skeleton-block is-agenda-action" key={actionIndex} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </section>
    </main>
)

const AdminArea = () => {
    const [status, setStatus] = useState<'checking' | 'authorized' | 'error'>('checking')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
    const [createEventRequest, setCreateEventRequest] = useState<{ date: string | null } | null>(null)
    const [eventActionRequest, setEventActionRequest] = useState<{
        eventId: string
        action: 'edit' | 'delete'
    } | null>(null)

    const selectSection = (section: AdminSection) => {
        setActiveSection(section)
        if (section !== 'eventos') {
            setCreateEventRequest(null)
            setEventActionRequest(null)
        }
    }

    const createEventAtDate = (date: string | null = null) => {
        setCreateEventRequest({ date })
        setEventActionRequest(null)
        setActiveSection('eventos')
    }

    const handleDashboardEventAction = (eventId: string, action: 'edit' | 'delete') => {
        setEventActionRequest({ eventId, action })
        setCreateEventRequest(null)
        setActiveSection('eventos')
    }

    useEffect(() => {
        let active = true

        const checkAdminAccess = async () => {
            try {
                const profile = await restoreAdminProfile()
                if (!active) return

                if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role) || !profile.active) {
                    window.location.hash = '#/admin/login'
                    return
                }

                setStatus('authorized')
            } catch (error) {
                if (!active) return
                setErrorMessage(getUserFacingError(error, 'Não foi possível validar sua conta administrativa.'))
                setStatus('error')
            }
        }

        void checkAdminAccess()
        return () => {
            active = false
        }
    }, [])

    return (
        <>
            <Header initialActiveLink="#/admin" />
            {status === 'checking' && <AdminAccessSkeleton />}
            {status === 'error' && (
                <main className="admin-area-error-state" role="alert">
                    <div className="admin-area-error-card">
                        <span className="admin-area-error-icon" aria-hidden="true">
                            <Icon name="error" />
                        </span>
                        <h1>Não foi possível validar o acesso administrativo</h1>
                        <p>{errorMessage}</p>
                    </div>
                </main>
            )}

            {status === 'authorized' && (
                <main className="admin-area">
                    <AdminSideNav activeItem={activeSection} onSelect={selectSection} />
                    <section className="admin-area-content" aria-label="Conteúdo administrativo">
                        {activeSection === 'dashboard' ? (
                            <AdminDashboard
                                onSelectSection={selectSection}
                                onCreateEventAtDate={createEventAtDate}
                                onEditEvent={eventId => handleDashboardEventAction(eventId, 'edit')}
                                onDeleteEvent={eventId => handleDashboardEventAction(eventId, 'delete')}
                            />
                        ) : activeSection === 'eventos' ? (
                            <AdminEvents
                                initialEventDate={createEventRequest?.date}
                                openCreateOnMount={Boolean(createEventRequest)}
                                initialEventAction={eventActionRequest}
                            />
                        ) : activeSection === 'informacoes' ? (
                            <AdminBusinessInfo />
                        ) : activeSection === 'administradores' ? (
                            <AdminAdministrators />
                        ) : activeSection === 'mensagens' ? (
                            <AdminUsersMessages />
                        ) : (
                            <div className="admin-area-placeholder">
                                Seção administrativa indisponível.
                            </div>
                        )}
                    </section>
                </main>
            )}
            {status === 'authorized' && <Footer />}
        </>
    )
}

export default AdminArea

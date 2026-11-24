import { navigate } from '../../services/navigation'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import AdminSideNav, { type AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import Icon from '../../components/Icon'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import { restoreAdminProfile } from '../../services/api'
import { ApiRequestError, getUserFacingError, isAdminDisabledError } from '../../services/errors'
import { getAdminAccessIssue, isAuthenticated, subscribeAuthState } from '../../services/authToken'
import AdminDisabledPage from '../loginPage/AdminDisabledPage'
import AdminDashboard from './AdminDashboard'
import './AdminArea.css'
import './AdminEventPageLayout.css'
import { getAdminHref } from '../../services/adminNavigation'

const AdminUsersMessages = lazy(() => import('./AdminUsersMessages'))
const AdminBusinessInfo = lazy(() => import('./AdminBusinessInfo'))
const AdminEvents = lazy(() => import('./AdminEvents'))
const AdminAdministrators = lazy(() => import('./AdminAdministrators'))

const AdminArea = ({ activeSection = 'dashboard' }: { activeSection?: AdminSection }) => {
    const signedIn = useSyncExternalStore(subscribeAuthState, isAuthenticated)
    const [status, setStatus] = useState<'checking' | 'authorized' | 'disabled' | 'error'>('checking')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [createEventRequest, setCreateEventRequest] = useState<{ date: string | null } | null>(null)
    const [eventActionRequest, setEventActionRequest] = useState<{
        eventId: string
        action: 'edit' | 'delete'
    } | {
        eventIds: string[]
        label: string
        action: 'filter'
    } | null>(null)

    const selectSection = (section: AdminSection) => {
        navigate(getAdminHref(section))
        if (section !== 'eventos') {
            setCreateEventRequest(null)
            setEventActionRequest(null)
        }
    }

    const createEventAtDate = (date: string | null = null) => {
        setCreateEventRequest({ date })
        setEventActionRequest(null)
        navigate(getAdminHref('eventos'))
    }

    const handleDashboardEventAction = (eventId: string, action: 'edit' | 'delete') => {
        setEventActionRequest({ eventId, action })
        setCreateEventRequest(null)
        navigate(getAdminHref('eventos'))
    }

    const handleDashboardEventFilter = (eventIds: string[], label: string) => {
        setEventActionRequest({ eventIds, label, action: 'filter' })
        setCreateEventRequest(null)
        navigate(getAdminHref('eventos'))
    }

    useEffect(() => {
        let active = true

        const checkAdminAccess = async () => {
            try {
                const profile = await restoreAdminProfile()
                if (!active) return

                if (!profile) {
                    navigate('/admin/login', { replace: true })
                    return
                }
                if (!profile.active || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
                    setErrorMessage('Esta conta não tem permissão para acessar a área administrativa.')
                    setStatus('error')
                    return
                }

                setStatus('authorized')
            } catch (error) {
                if (!active) return
                if (error instanceof ApiRequestError && error.status === 401) {
                    navigate('/admin/login', { replace: true })
                    return
                }
                if (isAdminDisabledError(error)) {
                    setStatus('disabled')
                    return
                }
                setErrorMessage(getUserFacingError(error, 'Não foi possível validar sua conta administrativa.'))
                setStatus('error')
            }
        }

        void checkAdminAccess()
        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (status === 'authorized' && !signedIn && !getAdminAccessIssue()) {
            navigate('/admin/login', { replace: true })
        }
    }, [signedIn, status])

    if (status === 'disabled') return <AdminDisabledPage />
    if (status === 'checking' || (status === 'authorized' && !signedIn)) {
        return <main className="admin-session-check"><p role="status">Verificando sessão...</p></main>
    }

    if (status === 'error') {
        return (
            <main className="admin-area-error-state" role="alert">
                <div className="admin-area-error-card">
                    <span className="admin-area-error-icon" aria-hidden="true">
                        <Icon name="error" />
                    </span>
                    <h1>Não foi possível validar o acesso administrativo</h1>
                    <p>{errorMessage}</p>
                </div>
            </main>
        )
    }

    return (
        <>
            <Header initialActiveLink="/admin" />
            <main className="admin-area">
                <AdminSideNav activeItem={activeSection} onSelect={selectSection} />
                <section className="admin-area-content" aria-label="Conteúdo administrativo">
                    <Suspense fallback={<p className="admin-area-placeholder" role="status">Carregando seção...</p>}>
                        {activeSection === 'dashboard' ? (
                            <AdminDashboard
                                onSelectSection={selectSection}
                                onCreateEventAtDate={createEventAtDate}
                                onEditEvent={eventId => handleDashboardEventAction(eventId, 'edit')}
                                onFilterEvents={handleDashboardEventFilter}
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
                    </Suspense>
                </section>
            </main>
            <Footer />
        </>
    )
}

export default AdminArea

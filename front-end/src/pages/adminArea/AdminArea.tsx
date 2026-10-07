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
            {status === 'checking' && <p role="status">Verificando acesso administrativo...</p>}
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
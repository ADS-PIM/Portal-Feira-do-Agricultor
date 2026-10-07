import { useEffect, useState } from 'react'
import AdminSideNav, { type AdminSection } from '../../components/AdminSideNav/AdminSideNav'
import Header from '../../components/Header/Header'
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
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2.1h16a1.4 1.4 0 0 0 1.2-2.1L12 3Z" />
                                <path d="M12 9v5m0 3h.01" />
                            </svg>
                        </span>
                        <h1>Não foi possível validar o acesso administrativo</h1>
                        <p>{errorMessage}</p>
                    </div>
                </main>
            )}
            {status === 'authorized' && (
                <main className="admin-area">
                    <AdminSideNav activeItem={activeSection} onSelect={setActiveSection} />
                    <section className="admin-area-content" aria-label="Conteúdo administrativo">
                        {activeSection === 'dashboard' ? (
                            <AdminDashboard onSelectSection={setActiveSection} />
                        ) : activeSection === 'eventos' ? (
                            <AdminEvents />
                        ) : activeSection === 'informacoes' ? (
                            <AdminBusinessInfo />
                        ) : activeSection === 'administradores' ? (
                            <AdminAdministrators />
                        ) : (
                            <div className="admin-area-placeholder">
                                Mensagens de usuários
                            </div>
                        )}
                    </section>
                </main>
            )}
        </>
    )
}

export default AdminArea
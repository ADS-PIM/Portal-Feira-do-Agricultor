import './Header.css'
import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/brotando_feiras_logo.png'
import { restoreAdminProfile } from '../../services/api'
import {
    AUTH_STATE_CHANGE_EVENT,
    getAdminProfile,
    isAuthenticated,
    type AdminProfile,
} from '../../services/authToken'

const navigationLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#/calendario', label: 'Calendário' },
    { href: '#contato', label: 'Fale Conosco' },
    { href: '#calculadora', label: 'Calculadora de Preços' },
    { href: '#/admin', label: 'Área administrativa' },
]

type HeaderProps = {
    // Permite que uma página específica (como a de login) force qual link
    // começa demarcado, em vez de sempre abrir em '#inicio'.
    initialActiveLink?: string
}

const Header = ({ initialActiveLink = '#inicio' }: HeaderProps) => {

    const [activeLink, setActiveLink] = useState(initialActiveLink);
    const [isVisible, setIsVisible] = useState(true);
    const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(() => getAdminProfile())
    const [hasCheckedSession, setHasCheckedSession] = useState(false)
    const lastVisibilityChangeY = useRef(0);
    const hasInitializedScrollPosition = useRef(false)

    useEffect(() => {
        const syncAuthState = () => {
            const profile = getAdminProfile()
            setAdminProfile(profile)
            if (profile || !isAuthenticated()) setHasCheckedSession(true)
        }

        window.addEventListener(AUTH_STATE_CHANGE_EVENT, syncAuthState)
        void restoreAdminProfile()
            .catch((error: unknown) => {
                console.error('Não foi possível restaurar o perfil do administrador:', error)
            })
            .finally(() => {
                setAdminProfile(getAdminProfile())
                setHasCheckedSession(true)
            })

        return () => window.removeEventListener(AUTH_STATE_CHANGE_EVENT, syncAuthState)
    }, [])

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = Math.max(0, window.scrollY)

            if (!hasInitializedScrollPosition.current) {
                lastVisibilityChangeY.current = currentScrollY
                hasInitializedScrollPosition.current = true
                return
            }

            const scrollDelta = currentScrollY - lastVisibilityChangeY.current

            if (currentScrollY <= 80) {
                setIsVisible(true)
                lastVisibilityChangeY.current = currentScrollY
                return
            }

            if (scrollDelta >= 12) {
                setIsVisible(false)
                lastVisibilityChangeY.current = currentScrollY
            } else if (scrollDelta <= -12) {
                setIsVisible(true)
                lastVisibilityChangeY.current = currentScrollY
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header className={`site-header${isVisible ? '' : ' is-hidden'}`}>
            <a className="site-header-brand" href="#inicio" aria-label="Brotando Feiras - início">
                <img src={logo} alt="Brotando Feiras" />
            </a>

            <nav className="site-header-navigation" aria-label="Navegação principal">
                {navigationLinks.map(({ href, label }) => (
                    <a
                        key={href}
                        className={activeLink === href ? 'is-active' : ''}
                        href={href}
                        aria-current={activeLink === href ? 'page' : undefined}
                        onClick={() => setActiveLink(href)}
                    >
                        {label}
                    </a>
                ))}
            </nav>

            <div className="site-header-account">
                {adminProfile ? (
                    <div className="site-header-profile">
                        <div className="site-header-profile-info">
                            <span className="site-header-profile-name">{adminProfile.name}</span>
                            <span className="site-header-profile-role">
                                {adminProfile.role === 'SUPER_ADMIN' ? 'Administrador principal' : 'Administrador'}
                            </span>
                        </div>
                        <div className="site-header-profile-picture">
                            {adminProfile.profile_picture?.trim() ? (
                                <img
                                    src={adminProfile.profile_picture.trim()}
                                    alt={`Foto de perfil de ${adminProfile.name}`}
                                    onError={(event) => {
                                        event.currentTarget.hidden = true
                                        const fallbackIcon = event.currentTarget.parentElement?.querySelector('svg')
                                        if (fallbackIcon) fallbackIcon.style.display = 'block'
                                    }}
                                />
                            ) : null}
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                                style={{ display: adminProfile.profile_picture?.trim() ? 'none' : 'block' }}
                            >
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                            </svg>
                        </div>
                    </div>
                ) : hasCheckedSession ? (
                    <button type="button" onClick={() => { window.location.hash = '#/admin/login' }}>
                        Entrar
                    </button>
                ) : null}
            </div>
        </header>
    )
}

export default Header
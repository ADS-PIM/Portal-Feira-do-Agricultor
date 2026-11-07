import './Header.css'
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import logo from '../../assets/brotando-feiras-alinhada-direita-tons.png'
import Icon from '../Icon'
import { restoreAdminProfile } from '../../services/api'
import { getProfileHref } from '../../services/profileNavigation'
import { getTheme, subscribeTheme, toggleTheme } from '../../services/theme'
import {
    AUTH_STATE_CHANGE_EVENT,
    getAdminProfile,
    getAuthDisplayState,
    getCachedHeaderProfile,
    isAuthenticated,
    type AdminProfile,
    type HeaderProfile,
} from '../../services/authToken'

const navigationLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#/calendario', label: 'Calendário' },
    { href: '#/produtores', label: 'Produtores' },
    { href: '#contato', label: 'Fale Conosco' },
    { href: '#/calculadora', label: 'Calculadora de Preços' },
    { href: '#/admin', label: 'Área administrativa' },
]

type HeaderProps = {
    // Permite que uma página específica (como a de login) force qual link
    // começa demarcado, em vez de sempre abrir em '#inicio'.
    initialActiveLink?: string
}

// Keep the completed check across page mounts, without persisting session data.
let hasCheckedHeaderSession = false
let headerSessionInFlight: Promise<AdminProfile | null> | null = null

const restoreHeaderSession = (): Promise<AdminProfile | null> => {
    if (hasCheckedHeaderSession && !isAuthenticated()) return Promise.resolve(null)
    if (!headerSessionInFlight) {
        headerSessionInFlight = restoreAdminProfile()
            .then(profile => {
                hasCheckedHeaderSession = true
                return profile
            })
            .finally(() => { headerSessionInFlight = null })
    }
    return headerSessionInFlight
}

const Header = ({ initialActiveLink = '#inicio' }: HeaderProps) => {

    const [activeLink, setActiveLink] = useState(initialActiveLink);
    const [isVisible, setIsVisible] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const headerRef = useRef<HTMLElement>(null)
    const menuButtonRef = useRef<HTMLButtonElement>(null)
    const navigationId = useId()
    const theme = useSyncExternalStore(subscribeTheme, getTheme)
    const themeButtonLabel = theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'
    const [authenticated, setAuthenticated] = useState(isAuthenticated)
    const [adminProfile, setAdminProfile] = useState<HeaderProfile | null>(() => getAdminProfile() ?? getCachedHeaderProfile())
    const [hasCheckedSession, setHasCheckedSession] = useState(() => hasCheckedHeaderSession || Boolean(getAdminProfile()) || (!isAuthenticated() && getAuthDisplayState() === 'guest'))
    const [currentHash, setCurrentHash] = useState(() => window.location.hash)
    const lastVisibilityChangeY = useRef(0);
    const hasInitializedScrollPosition = useRef(false)
    const hasAccountDisplay = authenticated || Boolean(adminProfile)
    const visibleNavigationLinks = navigationLinks.filter(({ href }) => href !== '#/admin' || hasAccountDisplay)

    useEffect(() => {
        const syncHash = () => setCurrentHash(window.location.hash)
        window.addEventListener('hashchange', syncHash)
        return () => window.removeEventListener('hashchange', syncHash)
    }, [])

    useLayoutEffect(() => {
        const header = headerRef.current
        if (!header) return

        // Measure the actual gutter: viewport units can already exclude reserved scrollbars.
        const updateScrollbarOffset = () => {
            const gutter = Math.max(0, window.innerWidth - header.getBoundingClientRect().width)
            header.style.setProperty('--header-scrollbar-offset', `${gutter / 2}px`)
        }

        updateScrollbarOffset()
        const observer = new ResizeObserver(updateScrollbarOffset)
        observer.observe(header)
        window.addEventListener('resize', updateScrollbarOffset)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updateScrollbarOffset)
        }
    }, [])

    useEffect(() => {
        if (!isMenuOpen) return

        const closeMenu = () => setIsMenuOpen(false)
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenu()
                menuButtonRef.current?.focus()
            }
        }
        const handlePointerDown = (event: PointerEvent) => {
            if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
                closeMenu()
            }
        }
        // Keep this breakpoint in sync with the compact layout in Header.css.
        const compactViewport = window.matchMedia('(max-width: 1200px)')
        const handleViewportChange = (event: MediaQueryListEvent) => {
            if (!event.matches) closeMenu()
        }

        document.addEventListener('keydown', handleKeyDown)
        document.addEventListener('pointerdown', handlePointerDown)
        window.addEventListener('hashchange', closeMenu)
        compactViewport.addEventListener('change', handleViewportChange)
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.removeEventListener('pointerdown', handlePointerDown)
            window.removeEventListener('hashchange', closeMenu)
            compactViewport.removeEventListener('change', handleViewportChange)
        }
    }, [isMenuOpen])

    useEffect(() => {
        const syncAuthState = () => {
            const profile = getAdminProfile()
            const authenticated = isAuthenticated()
            setAuthenticated(authenticated)
            // A refresh token arrives before the profile: keep the current display in between.
            setAdminProfile(current => profile ?? (authenticated ? current : null))
            if (profile || !authenticated) setHasCheckedSession(true)
        }

        window.addEventListener(AUTH_STATE_CHANGE_EVENT, syncAuthState)
        void restoreHeaderSession()
            .then(() => syncAuthState())
            .catch((error: unknown) => {
                console.error('Não foi possível restaurar o perfil do administrador:', error)
            })
            .finally(() => {
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
        <header ref={headerRef} className={`site-header${hasAccountDisplay ? '' : ' is-guest'}${isVisible || isMenuOpen ? '' : ' is-hidden'}${isMenuOpen ? ' is-menu-open' : ''}`}>
            <a className="site-header-brand" href="#inicio" aria-label="Brotando Feiras - início" onClick={() => setIsMenuOpen(false)}>
                <img src={logo} alt="Brotando Feiras" />
            </a>

            <button
                ref={menuButtonRef}
                className="site-header-menu-toggle"
                type="button"
                aria-label={isMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
                aria-expanded={isMenuOpen}
                aria-controls={navigationId}
                onClick={() => setIsMenuOpen(open => !open)}
            >
                <span className="site-header-menu-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </span>
            </button>

            <nav id={navigationId} className="site-header-navigation" aria-label="Navegação principal">
                {visibleNavigationLinks.map(({ href, label }) => (
                    <a
                        key={href}
                        className={activeLink === href ? 'is-active' : ''}
                        href={href}
                        aria-current={activeLink === href ? 'page' : undefined}
                        onClick={() => {
                            setActiveLink(href)
                            setIsMenuOpen(false)
                        }}
                    >
                        {label}
                    </a>
                ))}
            </nav>

            <div className="site-header-account">
                <button
                    className="site-header-theme-toggle"
                    type="button"
                    aria-label={themeButtonLabel}
                    title={themeButtonLabel}
                    onClick={toggleTheme}
                >
                    <Icon name={theme === 'light' ? 'moon' : 'sun'} />
                </button>
                {adminProfile ? (
                    <a className="site-header-profile" href={getProfileHref(currentHash)} aria-label="Visualizar minha conta" aria-current={initialActiveLink === '#/minha-conta' ? 'page' : undefined} onClick={() => setIsMenuOpen(false)}>
                        <div className="site-header-profile-info">
                            <span className="site-header-profile-name">{adminProfile.name}</span>
                            <span className="site-header-profile-role">
                                {adminProfile.role === 'SUPER_ADMIN' ? 'Administrador principal' : 'Administrador'}
                            </span>
                        </div>
                        <div className="site-header-profile-picture">
                            {adminProfile.profile_picture?.trim() ? (
                                <img
                                    key={adminProfile.profile_picture}
                                    src={adminProfile.profile_picture.trim()}
                                    alt={`Foto de perfil de ${adminProfile.name}`}
                                    onError={(event) => {
                                        event.currentTarget.hidden = true
                                        const fallbackIcon = event.currentTarget.parentElement?.querySelector('svg')
                                        if (fallbackIcon) fallbackIcon.style.display = 'block'
                                    }}
                                />
                            ) : null}
                            <Icon
                                name="user"
                                style={{ display: adminProfile.profile_picture?.trim() ? 'none' : 'block' }}
                            />
                        </div>
                    </a>
                ) : hasCheckedSession ? (
                    <button type="button" onClick={() => { setIsMenuOpen(false); window.location.hash = '#/admin/login' }}>
                        Entrar
                    </button>
                ) : (
                    <span className="site-header-session-placeholder" aria-hidden="true" />
                )}
            </div>
        </header>
    )
}

export default Header

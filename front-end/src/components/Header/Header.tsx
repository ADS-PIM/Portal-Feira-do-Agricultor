import './Header.css'
import { useEffect, useRef, useState } from 'react'
import { restoreAdminProfile } from '../../services/api'
import {
    AUTH_STATE_CHANGE_EVENT,
    getAdminProfile,
    isAuthenticated,
    type AdminProfile,
} from '../../services/authToken'

// const navigationLinks = [
//     { href: '#inicio', label: 'Início' },
//     { href: '#calendario', label: 'Calendário' },
//     { href: '#contato', label: 'Fale Conosco' },
//     { href: '#calculadora', label: 'Calculadora de Preços' },
//     { href: '#area-administrativa', label: 'Área administrativa' },
// ]

// const Header = () => {
//     const [activeLink, setActiveLink] = useState('#inicio')
//     const [isVisible, setIsVisible] = useState(true)
//     const lastVisibilityChangeY = useRef(0)

//     useEffect(() => {
//         const handleScroll = () => {
//             const currentScrollY = Math.max(0, window.scrollY)
//             const scrollDelta = currentScrollY - lastVisibilityChangeY.current

//             if (currentScrollY <= 80) {
//                 setIsVisible(true)
//                 lastVisibilityChangeY.current = currentScrollY
//                 return
//             }

//             if (scrollDelta >= 12) {
//                 setIsVisible(false)
//                 lastVisibilityChangeY.current = currentScrollY
//             } else if (scrollDelta <= -12) {
//                 setIsVisible(true)
//                 lastVisibilityChangeY.current = currentScrollY
//             }
//         }

//         window.addEventListener('scroll', handleScroll, { passive: true })
//         return () => window.removeEventListener('scroll', handleScroll)
//     }, [])

//     return (
//         <header className={`site-header${isVisible ? '' : ' is-hidden'}`}>
//             <a className="site-header-brand" href="#inicio" aria-label="Brotando Feiras - início">
//                 <span className="site-header-mark" aria-hidden="true">
//                     <svg viewBox="0 0 24 24" fill="none">
//                         <path d="M12 20V11m0 4c0-4-2.5-6-6-6 0 3.5 2 6 6 6Zm0-3c0-3.5 2-5.5 6-5.5 0 3.5-2 5.5-6 5.5Zm0-5V4m0 0c-1.5 0-2.5-1-2.5-2.5C11 1.5 12 2.5 12 4Zm0 0c1.5 0 2.5-1 2.5-2.5C13 1.5 12 2.5 12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
//                     </svg>
//                 </span>
//                 <span className="site-header-name">Brotando Feiras</span>
//             </a>

//             <nav className="site-header-navigation" aria-label="Navegação principal">
//                 {navigationLinks.map(({ href, label }) => (
//                     <a
//                         key={href}
//                         className={activeLink === href ? 'is-active' : ''}
//                         href={href}
//                         aria-current={activeLink === href ? 'page' : undefined}
//                         onClick={() => setActiveLink(href)}
//                     >
//                         {label}
//                     </a>
//                 ))}
//             </nav>

//             <div className="site-header-account">
//                 <button type="button">Entrar</button>
//             </div>
//         </header>
//     )
// }

// export default Header

const navigationLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#/calendario', label: 'Calendário' },
    { href: '#contato', label: 'Fale Conosco' },
    { href: '#calculadora', label: 'Calculadora de Preços' },
    { href: '#area-administrativa', label: 'Área administrativa' },
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
                <span className="site-header-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 20V11m0 4c0-4-2.5-6-6-6 0 3.5 2 6 6 6Zm0-3c0-3.5 2-5.5 6-5.5 0 3.5-2 5.5-6 5.5Zm0-5V4m0 0c-1.5 0-2.5-1-2.5-2.5C11 1.5 12 2.5 12 4Zm0 0c1.5 0 2.5-1 2.5-2.5C13 1.5 12 2.5 12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
                <span className="site-header-name">Brotando Feiras</span>
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
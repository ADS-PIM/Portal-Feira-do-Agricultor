import './Header.css'
import { useState } from 'react'

const navigationLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#calendario', label: 'Calendário' },
    { href: '#contato', label: 'Fale Conosco' },
    { href: '#calculadora', label: 'Calculadora de Preços' },
    { href: '#area-administrativa', label: 'Área administrativa' },
]

const Header = () => {
    const [activeLink, setActiveLink] = useState('#inicio')

    return (
        <header className="site-header">
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
                <button type="button">Entrar</button>
            </div>
        </header>
    )
}

export default Header
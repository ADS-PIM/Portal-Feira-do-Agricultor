import { useState } from 'react'
import './CookieBanner.css'

const COOKIE_NOTICE_STORAGE_KEY = 'brotando-feiras-cookie-notice-v1'

function wasNoticeDismissed() {
    try {
        return window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) === 'dismissed'
    } catch {
        return false
    }
}

function CookieBanner() {
    const [isVisible, setIsVisible] = useState(() => !wasNoticeDismissed())

    const dismissNotice = () => {
        try {
            window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, 'dismissed')
        } catch {
            // Keep the banner usable when browser storage is unavailable.
        }
        setIsVisible(false)
    }

    if (!isVisible) return null

    return (
        <aside className="cookie-banner" role="region" aria-labelledby="cookie-banner-title">
            <div className="cookie-banner__copy">
                <h2 id="cookie-banner-title">Aviso sobre cookies e armazenamento</h2>
                <p>
                    Usamos um cookie técnico necessário para manter a sessão da área administrativa e o armazenamento
                    do navegador para salvar preferências, como o tema. Não usamos cookies de publicidade nem ferramentas
                    de analytics.
                </p>
            </div>
            <div className="cookie-banner__actions">
                <a href="/politica-de-privacidade">Política de Privacidade</a>
                <button type="button" onClick={dismissNotice}>Entendi</button>
            </div>
        </aside>
    )
}

export default CookieBanner

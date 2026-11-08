const NAVIGATION_EVENT = 'portal:navigation'

// Keep previously shared links usable while generating only paths without hashes.
export function normalizePortalPath(value: string): string {
    const path = value.replace(/^#/, '')
    const [pathname, ...query] = path.split('?')
    const cleanPath = pathname.replace(/\/+$/, '') || '/'
    if (/^\/produtor\/[^/?#]+$/.test(cleanPath)) return '/produtores'
    const aliases: Record<string, string> = {
        inicio: '/', '/inicio': '/', sobre: '/sobre', contato: '/contato', calculadora: '/calculadora',
    }
    const normalized = Object.hasOwn(aliases, cleanPath) ? aliases[cleanPath] : cleanPath
    return `${normalized}${query.length ? `?${query.join('?')}` : ''}`
}

export function getCurrentPath(): string {
    const { pathname, search, hash } = window.location
    if (/^#\/(?!\/)/.test(hash) || /^#(?:inicio|sobre|contato|calculadora)$/.test(hash)) {
        return normalizePortalPath(hash)
    }
    return normalizePortalPath(`${pathname}${search}`)
}

export function subscribeNavigation(onChange: () => void): () => void {
    window.addEventListener(NAVIGATION_EVENT, onChange)
    return () => window.removeEventListener(NAVIGATION_EVENT, onChange)
}

export function navigate(path: string, { replace = false }: { replace?: boolean } = {}): void {
    const destination = normalizePortalPath(path)
    if (!destination.startsWith('/') || destination.startsWith('//') || destination.includes('\\')) return
    if (replace || `${window.location.pathname}${window.location.search}${window.location.hash}` !== destination) {
        window.history[replace ? 'replaceState' : 'pushState'](null, '', destination)
    }
    window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export function installNavigation(): () => void {
    const sync = () => {
        const path = getCurrentPath()
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== path) {
            window.history.replaceState(null, '', path)
        }
        window.dispatchEvent(new Event(NAVIGATION_EVENT))
    }
    const handleClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
        if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
        const href = anchor.getAttribute('href') || ''
        if (!href.startsWith('/') || href.startsWith('//') || anchor.origin !== window.location.origin || anchor.hash) return
        event.preventDefault()
        navigate(`${anchor.pathname}${anchor.search}`)
    }
    sync()
    document.addEventListener('click', handleClick)
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
        document.removeEventListener('click', handleClick)
        window.removeEventListener('popstate', sync)
        window.removeEventListener('hashchange', sync)
    }
}

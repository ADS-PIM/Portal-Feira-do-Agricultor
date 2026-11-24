const NAVIGATION_EVENT = 'portal:navigation'

type NavigationEntry = {
    index: number
    href: string
    previousIndex?: number
    previousHref?: string
    scroll: { x: number; y: number }
}

let activeEntry: NavigationEntry | undefined

function getNavigationEntry(): NavigationEntry | undefined {
    return window.history.state?.portalNavigation
}

function saveNavigationEntry(entry: NavigationEntry): void {
    window.history.replaceState({ ...window.history.state, portalNavigation: entry }, '')
    activeEntry = entry
}

export function getNavigationScrollPosition(): { x: number; y: number } {
    return getNavigationEntry()?.scroll ?? { x: 0, y: 0 }
}

function getReferrerPath(): string | undefined {
    if (!document.referrer) return undefined
    const referrer = new URL(document.referrer)
    if (referrer.origin !== window.location.origin || referrer.pathname.startsWith('//')) return undefined
    const href = referrer.pathname + referrer.search
    return href === getCurrentPath() ? undefined : href
}

export function getNavigationReturnPath(fallback = '/'): string {
    const entry = getNavigationEntry()
    return (entry ? entry.previousHref : getReferrerPath()) ?? fallback
}

export function goBack(fallback = '/'): void {
    const entry = getNavigationEntry()
    if (entry?.previousIndex !== undefined) {
        saveNavigationEntry({ ...entry, scroll: { x: window.scrollX, y: window.scrollY } })
        window.history.go(entry.previousIndex - entry.index)
    } else {
        navigate(getNavigationReturnPath(fallback))
    }
}

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

export function navigate(path: string, { replace = false, preserveReturn = false }: { replace?: boolean; preserveReturn?: boolean } = {}): void {
    const destination = normalizePortalPath(path)
    if (!destination.startsWith('/') || destination.startsWith('//') || destination.includes('\\')) return
    if (replace || `${window.location.pathname}${window.location.search}${window.location.hash}` !== destination) {
        const current = getNavigationEntry()
        if (current) saveNavigationEntry({ ...current, scroll: { x: window.scrollX, y: window.scrollY } })
        const entry: NavigationEntry = {
            index: (current?.index ?? 0) + (replace ? 0 : 1),
            href: destination,
            previousIndex: replace || preserveReturn ? current?.previousIndex : current?.index,
            previousHref: replace || preserveReturn ? current?.previousHref : current?.href,
            scroll: { x: 0, y: 0 },
        }
        window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, portalNavigation: entry }, '', destination)
        activeEntry = entry
    }
    window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export function installNavigation(): () => void {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const sync = () => {
        const path = getCurrentPath()
        const legacyHash = /^#\/(?!\/)|^#(?:inicio|sobre|contato|calculadora)$/.test(window.location.hash)
        const href = `${path}${legacyHash ? '' : window.location.hash}`
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== href) {
            window.history.replaceState(window.history.state, '', href)
        }
        const storedEntry = getNavigationEntry()
        // Browsers may create fragment entries without copying history.state.
        const entry = storedEntry ?? (activeEntry?.href.split('#')[0] === path ? activeEntry : undefined)
        // Section links add browser entries too; keep the page's original return target.
        if (!storedEntry || entry?.href !== href) saveNavigationEntry({
            index: entry ? entry.index + 1 : 0,
            href,
            previousIndex: entry?.previousIndex,
            previousHref: entry ? entry.previousHref : getReferrerPath(),
            scroll: { x: window.scrollX, y: window.scrollY },
        })
        else activeEntry = storedEntry
        window.dispatchEvent(new Event(NAVIGATION_EVENT))
    }
    const handleClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
        if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
        const href = anchor.getAttribute('href') || ''
        if (!href.startsWith('/') || href.startsWith('//') || anchor.origin !== window.location.origin) return
        if (anchor.hasAttribute('data-navigation-back')) {
            event.preventDefault()
            goBack(href)
            return
        }
        if (anchor.hash) return
        event.preventDefault()
        navigate(`${anchor.pathname}${anchor.search}`, { preserveReturn: anchor.hasAttribute('data-preserve-return') })
    }
    sync()
    document.addEventListener('click', handleClick)
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
        window.history.scrollRestoration = previousScrollRestoration
        document.removeEventListener('click', handleClick)
        window.removeEventListener('popstate', sync)
        window.removeEventListener('hashchange', sync)
    }
}

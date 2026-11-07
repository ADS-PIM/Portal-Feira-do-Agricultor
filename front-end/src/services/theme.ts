export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'brotando-feiras-theme'
const THEME_CHANGE_EVENT = 'theme-change'

export const getTheme = (): Theme => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

export function toggleTheme() {
    const theme = getTheme() === 'light' ? 'dark' : 'light'
    applyTheme(theme)
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
        // Keep the control usable when browser storage is unavailable.
    }
}

export function subscribeTheme(onChange: () => void) {
    const syncStoredTheme = (event: StorageEvent) => {
        if (event.storageArea === localStorage && (event.key === THEME_STORAGE_KEY || event.key === null)) {
            applyTheme(event.newValue === 'dark' ? 'dark' : 'light')
        }
    }

    window.addEventListener(THEME_CHANGE_EVENT, onChange)
    window.addEventListener('storage', syncStoredTheme)
    return () => {
        window.removeEventListener(THEME_CHANGE_EVENT, onChange)
        window.removeEventListener('storage', syncStoredTheme)
    }
}

import { makeApiUrl } from './apiUrl.ts'

const PRIVATE_BLOB_HOST = /^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i

// Keep the stored URL intact; private images are streamed by the API for display.
export function getEventImageUrl(value: string, apiBaseUrl?: string): string {
    try {
        const url = new URL(value)
        if (url.protocol !== 'https:' || !PRIVATE_BLOB_HOST.test(url.hostname)) return value

        const pathname = decodeURIComponent(url.pathname.replace(/^\//, ''))
        const query = new URLSearchParams({ pathname })
        return makeApiUrl(`event/image/file?${query}`, apiBaseUrl)
    } catch {
        return value
    }
}

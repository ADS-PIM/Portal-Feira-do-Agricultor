import { makeApiUrl } from './apiUrl.ts'

const PRIVATE_BLOB_HOST = /^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i

// A small, shared mipmap-style pyramid bounds the number of CDN derivatives.
const IMAGE_WIDTHS = [160, 320, 640, 1280, 2560] as const
type ImageWidth = typeof IMAGE_WIDTHS[number]

function cloudinaryImageUrl(value: string, width: ImageWidth): string | null {
    try {
        const url = new URL(value)
        // Only transform canonical event uploads. Leave signed, already
        // transformed and external URLs untouched.
        if (url.origin !== 'https://res.cloudinary.com' || url.username || url.password || url.search || url.hash) return null
        const match = /^\/([\w-]+)\/image\/upload\/(v\d+\/event-images\/[\w/-]+\.(?:jpg|jpeg|png))$/.exec(url.pathname)
        if (!match) return null
        return `${url.origin}/${match[1]}/image/upload/c_limit,w_${width}/f_auto,q_auto:best/${match[2]}`
    } catch {
        return null
    }
}

export function getEventImageProps(value: string, sizes: string, width: ImageWidth = 1280) {
    const src = cloudinaryImageUrl(value, width)
    return {
        src: src ?? getEventImageUrl(value),
        ...(src ? {
            srcSet: IMAGE_WIDTHS.map(size => `${cloudinaryImageUrl(value, size)} ${size}w`).join(', '),
            sizes,
        } : {}),
        decoding: 'async' as const,
    }
}

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

const API_BASE_URL = import.meta.env?.DEV
    ? ''
    : (import.meta.env?.VITE_API_BASE_URL ?? '')

export function makeApiUrl(endpoint: string, baseUrl = API_BASE_URL): string {
    const path = endpoint.replace(/^\/+/, '')
    return `${baseUrl.replace(/\/+$/, '')}/${path}`
}

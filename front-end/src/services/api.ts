const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const path = endpoint.replace(/^\/+/, '')
    const response = await fetch(`${API_BASE_URL}/${path}`, options)

    if (!response.ok) {
        const errorDetails = await response.text()
        const status = `${response.status} ${response.statusText}`.trim()
        throw new Error(errorDetails ? `API request failed (${status}): ${errorDetails}` : `API request failed (${status})`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
        throw new Error(
            `API returned a non-JSON response (${response.status} ${response.statusText}, content-type: ${contentType || 'unknown'}). Check that the backend is running and the API URL is configured correctly.`
        )
    }

    return response.json() as Promise<T>
}

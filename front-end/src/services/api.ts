import {
    clearAccessToken,
    getAccessToken,
    getAdminId,
    setAccessToken,
    setAdminId,
    setAdminProfile,
    type AdminProfile,
} from './authToken'
import { ApiRequestError } from './errors'

const API_BASE_URL = import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const makeUrl = (endpoint: string) => {
    const path = endpoint.replace(/^\/+/, '')
    return `${API_BASE_URL}/${path}`
}

const isSessionEndpoint = (endpoint: string) => /^admin\/(?:login|refresh|logout)(?:\/|$|\?)/.test(endpoint)

async function refreshAccessToken(): Promise<string | null> {
    const response = await fetch(makeUrl('admin/refresh'), {
        method: 'POST',
        credentials: 'include',
    })

    if (response.status === 401) {
        clearAccessToken()
        return null
    }

    if (!response.ok) {
        throw new ApiRequestError(response.status, 'admin/refresh')
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
        throw new Error('Não foi possível validar sua sessão.')
    }

    const result: unknown = await response.json()
    if (
        typeof result !== 'object' ||
        result === null ||
        !('accessToken' in result) ||
        typeof result.accessToken !== 'string' ||
        !result.accessToken ||
        !('userId' in result) ||
        typeof result.userId !== 'string' ||
        !result.userId
    ) {
        throw new Error('Não foi possível validar sua sessão.')
    }

    setAccessToken(result.accessToken)
    setAdminId(result.userId)
    return result.accessToken
}

let refreshInFlight: Promise<string | null> | null = null

function getRefreshedAccessToken(): Promise<string | null> {
    if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null
        })
    }
    return refreshInFlight
}

export async function restoreSession(): Promise<boolean> {
    if (getAccessToken()) return true
    return Boolean(await getRefreshedAccessToken())
}

export async function restoreAdminProfile(): Promise<AdminProfile | null> {
    if (!await restoreSession()) return null

    const adminId = getAdminId()
    if (!adminId) {
        clearAccessToken()
        return null
    }

    const profile = await apiFetch<AdminProfile>(`admin/${encodeURIComponent(adminId)}`)
    setAdminProfile(profile)
    return profile
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const path = endpoint.replace(/^\/+/, '')
    const sessionEndpoint = isSessionEndpoint(path)
    const headers = new Headers(options?.headers)
    const token = sessionEndpoint ? null : getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const requestOptions: RequestInit = {
        ...options,
        headers,
        credentials: 'include',
    }
    let response = await fetch(makeUrl(path), requestOptions)

    if (response.status === 401 && token && !sessionEndpoint) {
        const refreshedToken = await getRefreshedAccessToken()
        if (refreshedToken) {
            headers.set('Authorization', `Bearer ${refreshedToken}`)
            response = await fetch(makeUrl(path), requestOptions)
            if (response.status === 401) clearAccessToken()
        }
    }

    if (!response.ok) {
        throw new ApiRequestError(response.status, path)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
        throw new Error('Não foi possível carregar os dados. Tente novamente mais tarde.')
    }

    return response.json() as Promise<T>
}

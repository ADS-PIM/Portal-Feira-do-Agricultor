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
import { makeApiUrl } from './apiUrl'

const isSessionEndpoint = (endpoint: string) => /^admin\/(?:login|refresh|logout|forgot-password|reset-password)(?:\/|$|\?)/.test(endpoint)

async function readErrorCode(response: Response): Promise<string | undefined> {
    const payload: unknown = await response.json().catch(() => null)
    return payload && typeof payload === 'object' && 'code' in payload && typeof payload.code === 'string'
        ? payload.code : undefined
}

async function refreshAccessToken(): Promise<string | null> {
    const response = await fetch(makeApiUrl('admin/refresh'), {
        method: 'POST',
        credentials: 'include',
    })

    if (response.status === 401) {
        clearAccessToken()
        return null
    }

    if (!response.ok) {
        const code = await readErrorCode(response)
        if (response.status === 403 && code === 'ADMIN_DISABLED') clearAccessToken()
        throw new ApiRequestError(response.status, 'admin/refresh', code)
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
    if (!profile.active) {
        clearAccessToken()
        // Expire the refresh cookie so returning to login cannot restore this account again.
        await apiFetch('admin/logout', { method: 'POST' }).catch(() => {})
        throw new ApiRequestError(403, `admin/${encodeURIComponent(adminId)}`, 'ADMIN_DISABLED')
    }
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
    let response = await fetch(makeApiUrl(path), requestOptions)

    if (response.status === 401 && token && !sessionEndpoint) {
        const refreshedToken = await getRefreshedAccessToken()
        if (refreshedToken) {
            headers.set('Authorization', `Bearer ${refreshedToken}`)
            response = await fetch(makeApiUrl(path), requestOptions)
            if (response.status === 401) clearAccessToken()
        }
    }

    if (!response.ok) {
        let code: string | undefined
        const hasValidationCode = response.status === 400 && /^(?:business-info|admin\/(?:forgot-password|reset-password))(?:\/|$|\?)/.test(path)
        const isAdminResource = !sessionEndpoint && /^admin\/[^/?]+\/?(?:\?|$)/.test(path)
        if (hasValidationCode || isAdminResource || sessionEndpoint) code = await readErrorCode(response)
        if (response.status === 403 && code === 'ADMIN_DISABLED') clearAccessToken()
        throw new ApiRequestError(response.status, path, code)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
        throw new Error('Não foi possível carregar os dados. Tente novamente mais tarde.')
    }

    return response.json() as Promise<T>
}

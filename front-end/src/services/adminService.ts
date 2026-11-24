import { apiFetch } from './api'
import { clearAccessToken, getAdminProfile, setAdminProfile } from './authToken'
import { ApiRequestError } from './errors'

export async function logoutAdmin(): Promise<void> {
    try {
        await apiFetch<{ message: string }>('admin/logout', { method: 'POST' })
    } catch (error) {
        // The logout route returns 400 when there is no refresh cookie left.
        if (!(error instanceof ApiRequestError) || error.status !== 400) throw error
    }
    clearAccessToken()
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN'

export function getAdminCounts(signal: AbortSignal) {
    return apiFetch<{ total: number; active: number }>('admin?view=counts', { signal })
}

export type AdminRecord = {
    id: string
    name: string
    email: string
    role: AdminRole
    active: boolean
    mustResetPassword?: boolean
    anonymizedAt?: string | null
    password?: string
    profile_picture: string | null
    createdAt?: string | null
}

export type AdminCreateInput = {
    name: string
    email: string
    password: string
    role: AdminRole
}

export async function getAdmins(): Promise<AdminRecord[]> {
    const admins = await apiFetch<AdminRecord[]>('admin')
    return Array.isArray(admins) ? admins : []
}

export async function createAdmin(payload: AdminCreateInput): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('admin/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function updateAdmin(id: string, payload: Partial<AdminRecord>): Promise<{ message: string }> {
    const result = await apiFetch<{ message: string }>(`admin/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    const profile = getAdminProfile()
    if (profile?.id === id) {
        // Apply self-updates immediately, even if refreshing the administrator list fails.
        // Only public profile fields belong in the shared authentication state.
        setAdminProfile({
            ...profile,
            name: payload.name ?? profile.name,
            email: payload.email ?? profile.email,
            role: payload.role ?? profile.role,
            active: payload.active ?? profile.active,
            profile_picture: payload.profile_picture !== undefined ? payload.profile_picture : profile.profile_picture,
        })
    }
    return result
}

export async function reactivateAdmin(id: string): Promise<{ mustResetPassword: true }> {
    return apiFetch<{ mustResetPassword: true }>(`admin/${encodeURIComponent(id)}/reactivate`, { method: 'PATCH' })
}

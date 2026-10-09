import { apiFetch } from './api'
import { clearAccessToken } from './authToken'
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

export type AdminRecord = {
    id: string
    name: string
    email: string
    role: AdminRole
    active: boolean
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
    return apiFetch<{ message: string }>(`admin/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
}

export async function deleteAdmin(id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`admin/${encodeURIComponent(id)}`, {
        method: 'DELETE',
    })
}

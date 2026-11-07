let accessToken: string | null = null
let adminId: string | null = null
export interface AdminProfile {
    id: string
    name: string
    email: string
    role: string
    active: boolean
    profile_picture: string | null
}

let adminProfile: AdminProfile | null = null
export type AdminAccessIssue = 'disabled' | 'revoked'
let adminAccessIssue: AdminAccessIssue | null = null
export const AUTH_STATE_CHANGE_EVENT = 'auth-state-change'

const AUTH_DISPLAY_STORAGE_KEY = 'brotando-feiras-auth-display'
const HEADER_PROFILE_STORAGE_KEY = 'brotando-feiras-header-profile'
type AuthDisplayState = 'guest' | 'authenticated'
export type HeaderProfile = Pick<AdminProfile, 'name' | 'role' | 'profile_picture'>

// Visual hints only; credentials and the authoritative profile remain in memory.
export const getAuthDisplayState = (): AuthDisplayState | null => {
    try {
        if (typeof window === 'undefined') return null
        const state = window.localStorage.getItem(AUTH_DISPLAY_STORAGE_KEY)
        return state === 'guest' || state === 'authenticated' ? state : null
    } catch {
        return null
    }
}

export const getCachedHeaderProfile = (): HeaderProfile | null => {
    try {
        if (typeof window === 'undefined' || getAuthDisplayState() === 'guest') return null
        const cached: unknown = JSON.parse(window.sessionStorage.getItem(HEADER_PROFILE_STORAGE_KEY) ?? 'null')
        if (
            !cached || typeof cached !== 'object' ||
            !('name' in cached) || typeof cached.name !== 'string' || !cached.name.trim() ||
            !('role' in cached) || (cached.role !== 'ADMIN' && cached.role !== 'SUPER_ADMIN') ||
            !('profile_picture' in cached) || (cached.profile_picture !== null && typeof cached.profile_picture !== 'string')
        ) return null
        return { name: cached.name, role: cached.role, profile_picture: cached.profile_picture }
    } catch {
        return null
    }
}

const rememberHeaderProfile = (profile: AdminProfile | null) => {
    try {
        if (typeof window === 'undefined') return
        if (profile) {
            const display: HeaderProfile = { name: profile.name, role: profile.role, profile_picture: profile.profile_picture }
            window.sessionStorage.setItem(HEADER_PROFILE_STORAGE_KEY, JSON.stringify(display))
        } else {
            window.sessionStorage.removeItem(HEADER_PROFILE_STORAGE_KEY)
        }
    } catch {
        // The display cache is optional and never controls access to the account.
    }
}

const rememberAuthDisplayState = (state: AuthDisplayState) => {
    try {
        if (typeof window !== 'undefined') window.localStorage.setItem(AUTH_DISPLAY_STORAGE_KEY, state)
    } catch {
        // Browsers may block storage; session restoration still works normally.
    }
}

const notifyAuthStateChange = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT))
    }
}

export const authToken = {
    setAccessToken: (token: string) => {
        if (adminAccessIssue) return
        accessToken = token
        rememberAuthDisplayState('authenticated')
        notifyAuthStateChange()
    },

    getAccessToken: () => {
        return accessToken
    },

    clearAccessToken: () => {
        accessToken = null
        adminId = null
        adminProfile = null
        rememberHeaderProfile(null)
        rememberAuthDisplayState('guest')
        notifyAuthStateChange()
    },

    setAdminId: (id: string) => {
        if (adminAccessIssue) return
        adminId = id
    },

    getAdminId: () => {
        return adminId
    },

    setAdminProfile: (profile: AdminProfile) => {
        if (adminAccessIssue) return
        adminId = profile.id
        adminProfile = profile
        rememberHeaderProfile(profile)
        notifyAuthStateChange()
    },

    getAdminProfile: () => {
        return adminProfile
    },

    getAdminAccessIssue: () => adminAccessIssue,

    invalidateAdminAccess: (reason: AdminAccessIssue) => {
        // Keep the reason until acknowledged, including when older requests finish later.
        if (adminAccessIssue !== 'revoked') adminAccessIssue = reason
        accessToken = null
        adminId = null
        adminProfile = null
        rememberHeaderProfile(null)
        rememberAuthDisplayState('guest')
        notifyAuthStateChange()
    },

    dismissAdminAccessIssue: () => {
        adminAccessIssue = null
        notifyAuthStateChange()
    },

    isAuthenticated: () => Boolean(authToken.getAccessToken()),
}

export const {
    setAccessToken,
    getAccessToken,
    clearAccessToken,
    setAdminId,
    getAdminId,
    setAdminProfile,
    getAdminProfile,
    getAdminAccessIssue,
    invalidateAdminAccess,
    dismissAdminAccessIssue,
    isAuthenticated,
} = authToken

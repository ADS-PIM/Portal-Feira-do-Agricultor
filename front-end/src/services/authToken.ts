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

const notifyAuthStateChange = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT))
    }
}

export const authToken = {
    setAccessToken: (token: string) => {
        if (adminAccessIssue) return
        accessToken = token
        notifyAuthStateChange()
    },

    getAccessToken: () => {
        return accessToken
    },

    clearAccessToken: () => {
        accessToken = null
        adminId = null
        adminProfile = null
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

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
export const AUTH_STATE_CHANGE_EVENT = 'auth-state-change'

const notifyAuthStateChange = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_STATE_CHANGE_EVENT))
    }
}

export const authToken = {
    setAccessToken: (token: string) => {
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
        adminId = id
    },

    getAdminId: () => {
        return adminId
    },

    setAdminProfile: (profile: AdminProfile) => {
        adminId = profile.id
        adminProfile = profile
        notifyAuthStateChange()
    },

    getAdminProfile: () => {
        return adminProfile
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
    isAuthenticated,
} = authToken
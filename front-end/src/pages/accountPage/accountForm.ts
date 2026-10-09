import type { AdminProfile } from '../../services/authToken'
import type { AdminRecord, AdminRole } from '../../services/adminService'

export type AccountFormValues = {
    name: string; email: string; profile_picture: string
    role: AdminRole; active: boolean; password: string; confirmPassword: string
}

export function accountFormValues(profile: AdminProfile): AccountFormValues {
    return {
        name: profile.name, email: profile.email, profile_picture: profile.profile_picture ?? '',
        role: profile.role as AdminRole, active: Boolean(profile.active), password: '', confirmPassword: '',
    }
}

export function buildAccountUpdate(profile: AdminProfile, values: AccountFormValues): Partial<AdminRecord> {
    const name = values.name.trim()
    if (!name) throw new Error('Informe seu nome.')
    if (values.password !== values.confirmPassword) throw new Error('A confirmação da senha não confere.')
    const update: Partial<AdminRecord> = {}
    if (name !== profile.name) update.name = name
    const picture = values.profile_picture.trim() || null
    if (picture !== profile.profile_picture) update.profile_picture = picture
    if (values.password) update.password = values.password
    if (profile.role === 'SUPER_ADMIN') {
        if (values.email.trim() !== profile.email) update.email = values.email.trim()
        if (values.role !== 'ADMIN' && values.role !== 'SUPER_ADMIN') throw new Error('Selecione um perfil de acesso válido.')
        if (values.role !== profile.role) update.role = values.role
        if (values.active !== Boolean(profile.active)) update.active = values.active
    }
    return update
}

import { useEffect, useState, type FormEvent } from 'react'
import { deleteOwnAdmin, getAdmins } from '../../services/adminService'
import type { AdminProfile } from '../../services/authToken'
import { ApiRequestError, getUserFacingError } from '../../services/errors'

type DeletionEligibility = 'loading' | 'allowed' | 'last' | 'failed'

async function getSuperAdminEligibility(id: string): Promise<DeletionEligibility> {
    const admins = await getAdmins()
    return admins.some(admin => admin.id !== id && admin.role === 'SUPER_ADMIN' && admin.active) ? 'allowed' : 'last'
}

export default function AccountDeletion({ profile, disabled, onBusyChange }: {
    profile: AdminProfile
    disabled: boolean
    onBusyChange: (busy: boolean) => void
}) {
    const isSuper = profile.role === 'SUPER_ADMIN'
    const [eligibility, setEligibility] = useState<DeletionEligibility>('loading')
    const [attempt, setAttempt] = useState(0)
    const [confirming, setConfirming] = useState(false)
    const [password, setPassword] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isSuper || !profile.active) return
        let active = true
        void getSuperAdminEligibility(profile.id).then(result => {
            if (active) setEligibility(result)
        }).catch(() => {
            if (active) setEligibility('failed')
        })
        return () => { active = false }
    }, [isSuper, profile.id, profile.active, attempt])

    const beginConfirmation = async () => {
        if (!isSuper || !profile.active || disabled || deleting || eligibility === 'loading') return
        setPassword('')
        setError(null)
        setEligibility('loading')
        onBusyChange(true)
        try {
            const result = await getSuperAdminEligibility(profile.id)
            setEligibility(result)
            setConfirming(result === 'allowed')
        } catch {
            setEligibility('failed')
            setConfirming(false)
        } finally {
            onBusyChange(false)
        }
    }

    const removeAccount = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!isSuper || !profile.active || disabled || deleting || eligibility !== 'allowed' || !password) return
        setDeleting(true)
        onBusyChange(true)
        setError(null)
        try {
            await deleteOwnAdmin(profile.id, password)
            setPassword('')
            window.location.hash = '#/admin/login'
        } catch (requestError) {
            setPassword('')
            if (requestError instanceof ApiRequestError && requestError.code === 'LAST_SUPER_ADMIN') {
                setEligibility('last')
                setConfirming(false)
                return
            }
            setError(getUserFacingError(requestError, 'Não foi possível excluir sua conta. Tente novamente.'))
        } finally {
            setDeleting(false)
            onBusyChange(false)
        }
    }

    if (!isSuper || !profile.active) return null

    return <section className="account-deletion" aria-labelledby="account-delete-title">
        <h3 id="account-delete-title">Excluir minha conta</h3>
        <p>A exclusão é permanente e encerra seu acesso ao portal. Eventos vinculados serão preservados e transferidos para outro Super Admin ativo.</p>
        {eligibility === 'loading' && <p role="status">Verificando se outro Super Admin pode manter o acesso ao sistema...</p>}
        {eligibility === 'last' && <p className="account-feedback is-error" role="alert">Você não pode excluir sua conta porque é o único Super Admin ativo. Promova um administrador ativo ou reative outro Super Admin antes de sair. <button type="button" className="account-button is-secondary" disabled={disabled} onClick={() => { setEligibility('loading'); setAttempt(value => value + 1) }}>Verificar novamente</button></p>}
        {eligibility === 'failed' && <p role="alert">Não foi possível verificar os Super Admins. <button type="button" className="account-button is-secondary" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Verificar novamente</button></p>}
        {error && <p className="account-feedback is-error" role="alert">{error}</p>}
        {!confirming || eligibility !== 'allowed' ? <button type="button" className="account-button is-danger" disabled={disabled || eligibility !== 'allowed'} onClick={() => void beginConfirmation()}>Excluir minha conta</button> : <form onSubmit={removeAccount}>
            <fieldset className="account-fields" disabled={disabled || deleting || eligibility !== 'allowed'}>
                <label className="account-full-width" htmlFor="account-delete-password">Confirme sua senha atual<input id="account-delete-password" type="password" autoComplete="current-password" required autoFocus value={password} onChange={event => { setPassword(event.target.value); setError(null) }} /></label>
            </fieldset>
            <p>Ao confirmar, sua conta será removida e você será direcionado para a tela de acesso. Esta ação não pode ser desfeita.</p>
            <div className="account-form-actions">
                <button type="button" className="account-button is-secondary" disabled={disabled || deleting} onClick={() => { setConfirming(false); setPassword(''); setError(null) }}>Cancelar</button>
                <button type="submit" className="account-button is-danger" disabled={disabled || deleting || eligibility !== 'allowed' || !password}>{deleting ? 'Excluindo...' : 'Confirmar exclusão da minha conta'}</button>
            </div>
        </form>}
    </section>
}

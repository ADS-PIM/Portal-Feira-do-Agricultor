import { useEffect, useState, type FormEvent } from 'react'
import { deleteOwnAdmin, getAdmins } from '../../services/adminService'
import type { AdminProfile } from '../../services/authToken'
import { ApiRequestError, getUserFacingError } from '../../services/errors'

export default function AccountDeletion({ profile, disabled, onBusyChange }: {
    profile: AdminProfile
    disabled: boolean
    onBusyChange: (busy: boolean) => void
}) {
    const isSuper = profile.role === 'SUPER_ADMIN'
    const [eligibility, setEligibility] = useState(isSuper ? 'loading' : 'allowed')
    const [attempt, setAttempt] = useState(0)
    const [confirming, setConfirming] = useState(false)
    const [password, setPassword] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isSuper) return
        let active = true
        void getAdmins().then(admins => {
            if (active) setEligibility(admins.some(admin => admin.id !== profile.id && admin.role === 'SUPER_ADMIN' && admin.active) ? 'allowed' : 'last')
        }).catch(() => {
            if (active) setEligibility('failed')
        })
        return () => { active = false }
    }, [isSuper, profile.id, attempt])

    const removeAccount = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (disabled || deleting || eligibility !== 'allowed' || !password) return
        setDeleting(true)
        onBusyChange(true)
        setError(null)
        try {
            await deleteOwnAdmin(profile.id, password)
            setPassword('')
            window.location.hash = '#/admin/login'
        } catch (requestError) {
            setPassword('')
            if (requestError instanceof ApiRequestError && requestError.code === 'LAST_SUPER_ADMIN') setEligibility('last')
            setError(getUserFacingError(requestError, 'Não foi possível excluir sua conta. Tente novamente.'))
        } finally {
            setDeleting(false)
            onBusyChange(false)
        }
    }

    return <section className="account-deletion" aria-labelledby="account-delete-title">
        <h3 id="account-delete-title">Excluir minha conta</h3>
        <p>A exclusão é permanente e encerra seu acesso ao portal. Eventos vinculados serão preservados e transferidos para outro Super Admin ativo.</p>
        {eligibility === 'loading' && <p role="status">Verificando se outro Super Admin pode manter o acesso ao sistema...</p>}
        {eligibility === 'last' && <p className="account-feedback is-error" role="alert">Você não pode excluir sua conta porque é o único Super Admin ativo. Promova um administrador ativo ou reative outro Super Admin antes de sair.</p>}
        {eligibility === 'failed' && <p role="alert">Não foi possível verificar os Super Admins. <button type="button" className="account-button is-secondary" disabled={disabled} onClick={() => setAttempt(value => value + 1)}>Verificar novamente</button></p>}
        {error && <p className="account-feedback is-error" role="alert">{error}</p>}
        {!confirming ? <button type="button" className="account-button is-danger" disabled={disabled || eligibility !== 'allowed'} onClick={() => setConfirming(true)}>Excluir minha conta</button> : <form onSubmit={removeAccount}>
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

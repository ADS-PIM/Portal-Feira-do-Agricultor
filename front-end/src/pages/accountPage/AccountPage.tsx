import { useEffect, useState, type FormEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Icon from '../../components/Icon'
import { restoreAdminProfile } from '../../services/api'
import { logoutAdmin, updateAdmin } from '../../services/adminService'
import { setAdminProfile, type AdminProfile } from '../../services/authToken'
import { ApiRequestError, getUserFacingError } from '../../services/errors'
import { accountFormValues, buildAccountUpdate, type AccountFormValues } from './accountForm'
import './AccountPage.css'

function AccountAvatar({ profile }: { profile: AdminProfile }) {
    const [failed, setFailed] = useState(false)
    return <div className="account-avatar">{profile.profile_picture && !failed
        ? <img src={profile.profile_picture} alt={`Foto de ${profile.name}`} onError={() => setFailed(true)} />
        : <Icon name="user" />}</div>
}

function AccountDetails({ initialProfile }: { initialProfile: AdminProfile }) {
    const [profile, setProfile] = useState(initialProfile)
    const [values, setValues] = useState(() => accountFormValues(initialProfile))
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const [accessChanged, setAccessChanged] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const isSuper = profile.role === 'SUPER_ADMIN'
    const busy = saving || loggingOut
    const change = <K extends keyof AccountFormValues>(key: K, value: AccountFormValues[K]) => setValues(current => ({ ...current, [key]: value }))

    const logout = async () => {
        setLoggingOut(true)
        setError(null)
        try {
            await logoutAdmin()
            window.location.hash = '#/admin/login'
        } catch (requestError) {
            setError(getUserFacingError(requestError, 'Não foi possível encerrar a sessão. Tente sair novamente.'))
        } finally { setLoggingOut(false) }
    }

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setSuccess(null)
        let payload
        try { payload = buildAccountUpdate(profile, values) }
        catch (validationError) {
            setError((validationError as Error).message)
            return
        }
        if (!Object.keys(payload).length) {
            setSuccess('Nenhuma alteração para salvar.')
            return
        }
        setSaving(true)
        try {
            await updateAdmin(profile.id, payload)
            // Never place the password in the shared profile or session state.
            const updated: AdminProfile = {
                ...profile, name: payload.name ?? profile.name, email: payload.email ?? profile.email,
                role: payload.role ?? profile.role, active: payload.active ?? profile.active,
                profile_picture: payload.profile_picture !== undefined ? payload.profile_picture : profile.profile_picture,
            }
            setProfile(updated)
            setAdminProfile(updated)
            setValues(accountFormValues(updated))
            setEditing(false)
            setShowPassword(false)
            setSuccess('Informações atualizadas com sucesso.')
            if (payload.role !== undefined || payload.active !== undefined) {
                setAccessChanged(true)
                setSuccess('Acesso atualizado. Encerre a sessão para aplicar as novas permissões.')
                await logout()
            }
        } catch (requestError) {
            setError(getUserFacingError(requestError, 'Não foi possível salvar suas informações. Tente novamente.'))
        } finally { setSaving(false) }
    }

    return <div className="account-layout">
        <aside className="account-card account-summary">
            <AccountAvatar key={profile.profile_picture} profile={profile} />
            <h2>{profile.name}</h2><p>{profile.email}</p>
            <span className="account-role">{isSuper ? 'Administrador principal' : 'Administrador'}</span>
            <span className={`account-status${profile.active ? '' : ' is-inactive'}`}>{profile.active ? 'Conta ativa' : 'Conta inativa'}</span>
            <div className="account-session"><h3>Sessão da conta</h3><p>Encerre seu acesso ao terminar de usar o portal.</p><button type="button" className="account-logout" disabled={busy} onClick={() => void logout()}><Icon name="arrowRight" />{loggingOut ? 'Saindo...' : 'Sair da conta'}</button></div>
        </aside>
        <section className="account-card account-details" aria-labelledby="account-details-title">
            <div className="account-section-heading"><div><h2 id="account-details-title">Informações da conta</h2><p>Seus dados e preferências de acesso.</p></div>{!editing && <button className="account-button is-secondary" type="button" disabled={busy || accessChanged} onClick={() => { setEditing(true); setError(null); setSuccess(null) }}><Icon name="edit" />Editar informações</button>}</div>
            {error && <p className="account-feedback is-error" role="alert">{error}</p>}
            {success && <p className="account-feedback" role="status">{success}</p>}
            {!editing ? <dl className="account-info"><div><dt>Nome</dt><dd>{profile.name}</dd></div><div><dt>E-mail</dt><dd>{profile.email}</dd></div><div><dt>Perfil de acesso</dt><dd>{isSuper ? 'Administrador principal' : 'Administrador'}</dd></div><div><dt>Status</dt><dd>{profile.active ? 'Ativo' : 'Inativo'}</dd></div><div><dt>Senha</dt><dd>Protegida · altere em “Editar informações”</dd></div></dl> : (
                <form onSubmit={save}>
                    <fieldset className="account-fields" disabled={busy}>
                        <label>Nome<input autoFocus required autoComplete="name" value={values.name} onChange={e => change('name', e.target.value)} /></label>
                        <label>E-mail<input type="email" required autoComplete="email" readOnly={!isSuper} aria-describedby={!isSuper ? 'account-email-hint' : undefined} value={values.email} onChange={e => change('email', e.target.value)} />{!isSuper && <small id="account-email-hint">A alteração de e-mail é feita pelo administrador principal.</small>}</label>
                        <label className="account-full-width">Foto de perfil<input type="url" placeholder="https://exemplo.com/minha-foto.jpg" value={values.profile_picture} onChange={e => change('profile_picture', e.target.value)} /><small>Informe o endereço de uma imagem ou deixe vazio para remover a foto.</small></label>
                        {isSuper && <><label>Perfil de acesso<select value={values.role} onChange={e => change('role', e.target.value as AccountFormValues['role'])}><option value="SUPER_ADMIN">Administrador principal</option><option value="ADMIN">Administrador</option></select></label><label>Status da conta<select value={String(values.active)} onChange={e => change('active', e.target.value === 'true')}><option value="true">Ativa</option><option value="false">Inativa</option></select></label>{(values.role !== profile.role || values.active !== Boolean(profile.active)) && <p className="account-access-note account-full-width">Ao salvar, sua sessão será encerrada. Uma conta inativa não pode acessar a área administrativa; mudar para administrador remove as permissões de administrador principal.</p>}</>}
                        <div className="account-password-heading account-full-width"><h3>Alterar senha</h3><p>Deixe os campos vazios para manter sua senha atual.</p></div>
                        <label>Nova senha<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={values.password} onChange={e => change('password', e.target.value)} /></label>
                        <label>Confirmar nova senha<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" required={Boolean(values.password)} value={values.confirmPassword} onChange={e => change('confirmPassword', e.target.value)} /></label>
                        <button className="account-password-toggle account-full-width" type="button" aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}><Icon name={showPassword ? 'eyeSlash' : 'eye'} />{showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}</button>
                    </fieldset>
                    <div className="account-form-actions"><button type="button" className="account-button is-secondary" disabled={busy} onClick={() => { setValues(accountFormValues(profile)); setEditing(false); setShowPassword(false); setError(null); setSuccess(null) }}>Cancelar</button><button type="submit" className="account-button" disabled={busy}>{saving ? 'Salvando...' : 'Salvar alterações'}</button></div>
                </form>
            )}
        </section>
    </div>
}

export default function AccountPage() {
    const [profile, setProfile] = useState<AdminProfile | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [attempt, setAttempt] = useState(0)
    useEffect(() => {
        let active = true
        void restoreAdminProfile().then(result => {
            if (!active) return
            if (!result || !['ADMIN', 'SUPER_ADMIN'].includes(result.role)) {
                window.location.hash = '#/admin/login'
                return
            }
            setProfile(result)
        }).catch(requestError => {
            if (!active) return
            if (requestError instanceof ApiRequestError && requestError.status === 401) {
                window.location.hash = '#/admin/login'
                return
            }
            setError(getUserFacingError(requestError, 'Não foi possível carregar sua conta. Tente novamente.'))
        })
        return () => { active = false }
    }, [attempt])
    return <><Header initialActiveLink="#/minha-conta" /><main className="account-page"><div className="account-container"><a className="account-back" href="#/admin"><Icon name="arrowLeft" />Voltar ao painel</a><header className="account-heading"><span>SEU PERFIL</span><h1>Minha conta</h1><p>Gerencie suas informações e seu acesso ao portal.</p></header>{profile ? <AccountDetails initialProfile={profile} /> : error ? <section className="account-card"><p role="alert">{error}</p><button type="button" className="account-button" onClick={() => { setError(null); setAttempt(current => current + 1) }}>Tentar novamente</button></section> : <section className="account-card" role="status">Carregando sua conta...</section>}</div></main><Footer /></>
}

import { useState, type FormEvent } from 'react'
import Header from '../../components/Header/Header'
import Icon from '../../components/Icon'
import logo from '../../assets/instituto_brotar_logo_preto.png'
import { apiFetch } from '../../services/api'
import { clearAccessToken } from '../../services/authToken'
import { ApiRequestError, getUserFacingError } from '../../services/errors'
import './LoginPage.css'
import '../../components/Login/LoginPainel.css'
import './PasswordRecoveryPage.css'

type Props = { mode: 'request'; token?: never } | { mode: 'reset'; token: string }

export default function PasswordRecoveryPage({ mode, token }: Props) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [invalidLink, setInvalidLink] = useState(mode === 'reset' && !/^[a-f0-9]{64}$/.test(token || ''))
    const isReset = mode === 'reset'

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (loading) return
        setError(null)
        if (isReset) {
            if (password.length < 8 || !password.trim()) {
                setError('A nova senha deve ter pelo menos 8 caracteres.')
                return
            }
            if (new TextEncoder().encode(password).length > 72) {
                setError('A senha está muito longa. Reduza a quantidade de caracteres ou símbolos.')
                return
            }
            if (password !== confirmation) {
                setError('As senhas não coincidem. Confira a confirmação da nova senha.')
                return
            }
        }
        setLoading(true)
        try {
            await apiFetch(isReset ? 'admin/reset-password' : 'admin/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isReset ? { token, password } : { email: email.trim() }),
            })
            if (isReset) {
                clearAccessToken()
                setPassword('')
                setConfirmation('')
                // Remove the used credential from the current history entry.
                window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/admin/redefinir-senha`)
            }
            setSuccess(true)
        } catch (caught) {
            if (caught instanceof ApiRequestError && caught.code === 'INVALID_RESET_TOKEN') setInvalidLink(true)
            setError(getUserFacingError(caught, 'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page password-recovery-page">
            <Header initialActiveLink="#/admin" />
            <main className="login-page-content">
                <section className="login-painel password-recovery-panel" aria-labelledby="recovery-title">
                    <div className="login-painel-brand">
                        <img className="login-painel-logo" src={logo} alt="Instituto Brotar" />
                        <h1 id="recovery-title">{isReset ? 'Redefinir senha' : 'Esqueci minha senha'}</h1>
                        {!success && !invalidLink && <p className="login-painel-subtitle">
                            {isReset ? 'Crie uma nova senha para acessar sua conta.' : 'Informe seu e-mail administrativo para receber um link de recuperação.'}
                        </p>}
                    </div>

                    {success ? (
                        <div className="password-recovery-success" role="status">
                            <strong>{isReset ? 'Senha alterada com sucesso!' : 'Solicitação recebida'}</strong>
                            <p>{isReset ? 'Entre com sua nova senha para acessar a área administrativa.'
                                : 'Se este e-mail estiver associado a uma conta ativa, você receberá um link para redefinir sua senha. Confira também a pasta de spam.'}</p>
                            {!isReset && <p>O link é válido por 15 minutos. Se solicitar outro, use o mais recente.</p>}
                        </div>
                    ) : invalidLink ? (
                        <div className="password-recovery-invalid">
                            <p className="login-painel-error" role="alert">Este link é inválido ou expirou. Solicite um novo link para redefinir sua senha.</p>
                            <a className="login-painel-submit password-recovery-action" href="#/admin/esqueci-minha-senha">Solicitar novo link</a>
                        </div>
                    ) : (
                        <form className="login-painel-form" onSubmit={handleSubmit} aria-busy={loading}>
                            {error && <p className="login-painel-error" role="alert">{error}</p>}
                            {isReset ? <>
                                <div className="login-painel-field">
                                    <label htmlFor="recovery-password">Nova senha</label>
                                    <div className="login-painel-password-wrapper">
                                        <input id="recovery-password" type={visible ? 'text' : 'password'} autoComplete="new-password"
                                            value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={72}
                                            aria-describedby="recovery-password-hint" disabled={loading} />
                                        <button type="button" className="login-painel-toggle-visibility" onClick={() => setVisible(value => !value)}
                                            aria-label={visible ? 'Ocultar senhas' : 'Mostrar senhas'} title={visible ? 'Ocultar senhas' : 'Mostrar senhas'}>
                                            <Icon name={visible ? 'eyeSlash' : 'eye'} />
                                        </button>
                                    </div>
                                    <p id="recovery-password-hint" className="password-recovery-hint">Use pelo menos 8 caracteres.</p>
                                </div>
                                <div className="login-painel-field">
                                    <label htmlFor="recovery-confirmation">Confirmar nova senha</label>
                                    <input id="recovery-confirmation" type={visible ? 'text' : 'password'} autoComplete="new-password"
                                        value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={8} maxLength={72} disabled={loading} />
                                </div>
                            </> : (
                                <div className="login-painel-field">
                                    <label htmlFor="recovery-email">E-mail administrativo</label>
                                    <input id="recovery-email" type="email" autoComplete="email" placeholder="Seu e-mail cadastrado"
                                        value={email} onChange={event => setEmail(event.target.value)} required maxLength={320} disabled={loading} />
                                </div>
                            )}
                            <button type="submit" className="login-painel-submit" disabled={loading}>
                                {loading ? (isReset ? 'Salvando...' : 'Enviando...') : (isReset ? 'Salvar nova senha' : 'Enviar link de recuperação')}
                            </button>
                        </form>
                    )}
                    {success && !isReset && <button type="button" className="login-painel-forgot" onClick={() => { setSuccess(false); setError(null) }}>Solicitar outro link</button>}
                    <a className="password-recovery-back" href="#/admin/login">Voltar para o login</a>
                </section>
            </main>
        </div>
    )
}

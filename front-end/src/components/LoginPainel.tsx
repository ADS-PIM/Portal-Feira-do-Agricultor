import './LoginPainel.css'
import { useState, type FormEvent } from 'react'

export type LoginCredentials = {
    email: string
    password: string
}

type LoginPainelProps = {
    onSubmit: (credentials: LoginCredentials) => void | Promise<void>
    isLoading?: boolean
    errorMessage?: string | null
    onForgotPassword?: () => void
}

const LoginPainel = ({ onSubmit, isLoading = false, errorMessage = null, onForgotPassword }: LoginPainelProps) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        onSubmit({ email, password })
    }

    return (
        <div className="login-painel">
            <div className="login-painel-brand">
                <span className="login-painel-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 20V11m0 4c0-4-2.5-6-6-6 0 3.5 2 6 6 6Zm0-3c0-3.5 2-5.5 6-5.5 0 3.5-2 5.5-6 5.5Zm0-5V4m0 0c-1.5 0-2.5-1-2.5-2.5C11 1.5 12 2.5 12 4Zm0 0c1.5 0 2.5-1 2.5-2.5C13 1.5 12 2.5 12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
                <h1 className="login-painel-title">Brotando Feiras</h1>
                <p className="login-painel-subtitle">
                    Gestão da Feira do Agricultor Familiar · Tabuleiro do Norte
                </p>
            </div>

            <form className="login-painel-form" onSubmit={handleSubmit} noValidate>
                {errorMessage && (
                    <p className="login-painel-error" role="alert">
                        {errorMessage}
                    </p>
                )}

                <div className="login-painel-field">
                    <label htmlFor="login-email">E-mail Administrativo</label>
                    <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        placeholder="admin@brotandofeiras.com.br"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                </div>

                <div className="login-painel-field">
                    <div className="login-painel-field-header">
                        <label htmlFor="login-password">Senha de Acesso</label>
                        {onForgotPassword && (
                            <button
                                type="button"
                                className="login-painel-forgot"
                                onClick={onForgotPassword}
                            >
                                Esqueci minha senha
                            </button>
                        )}
                    </div>
                    <div className="login-painel-password-wrapper">
                        <input
                            id="login-password"
                            type={isPasswordVisible ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="login-painel-toggle-visibility"
                            onClick={() => setIsPasswordVisible((visible) => !visible)}
                            aria-label={isPasswordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                            {isPasswordVisible ? (
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.54 3.54M9.88 5.14A10.6 10.6 0 0 1 12 5c5 0 9 4 10.5 7-.63 1.26-1.6 2.6-2.84 3.74M6.35 6.98C4.4 8.2 2.9 10 1.5 12c1.5 3 5.5 7 10.5 7 1.3 0 2.5-.26 3.6-.72" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.6" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <button type="submit" className="login-painel-submit" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <p className="login-painel-footer">
                Acesso restrito para administradores autorizados pela Instituição Brotar.
            </p>
        </div>
    )
}

export default LoginPainel
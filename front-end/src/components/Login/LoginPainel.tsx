import './LoginPainel.css'
import { useState, type FormEvent } from 'react'
import logo from '../../assets/instituto_brotar_logo_preto.png'
import Icon from '../Icon'

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
                <img className="login-painel-logo" src={logo} alt="Instituto Brotar" />
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
                            <Icon name={isPasswordVisible ? 'eyeSlash' : 'eye'} />
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
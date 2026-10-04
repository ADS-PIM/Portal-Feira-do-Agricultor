import './LoginPage.css'
import { useEffect, useState } from 'react'
import Header from '../../components/Header/Header'
import LoginPainel from '../../components/Login/LoginPainel'
import type { LoginCredentials } from '../../components/Login/LoginPainel'
import { apiFetch, restoreAdminProfile } from '../../services/api'
import { getUserFacingError } from '../../services/errors'
import { setAccessToken, setAdminId, setAdminProfile, type AdminProfile } from '../../services/authToken'

interface LoginResponse {
    accessToken: string
    userId: string
}

type LoginPageProps = {
    onLoginSuccess?: (admin: AdminProfile) => void
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const [isCheckingSession, setIsCheckingSession] = useState(true)
    const [sessionRestored, setSessionRestored] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        const restoreExistingSession = async () => {
            try {
                const admin = await restoreAdminProfile()
                if (!admin) return
                if (!active) return
                setSessionRestored(true)
                onLoginSuccess?.(admin)
            } catch (error) {
                if (active) {
                    setErrorMessage(getUserFacingError(error, 'Não foi possível restaurar a sessão. Tente novamente.'))
                }
            } finally {
                if (active) setIsCheckingSession(false)
            }
        }

        void restoreExistingSession()
        return () => {
            active = false
        }
    }, [onLoginSuccess])

    const handleSubmit = async (credentials: LoginCredentials) => {
        setErrorMessage(null)
        setIsLoading(true)

        try {
            const { accessToken, userId } = await apiFetch<LoginResponse>('admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            })

            setAccessToken(accessToken)
            setAdminId(userId)

            const admin = await apiFetch<AdminProfile>(`admin/${encodeURIComponent(userId)}`)
            setAdminProfile(admin)
            onLoginSuccess?.(admin)
        } catch (error) {
            setErrorMessage(getUserFacingError(error, 'Não foi possível entrar. Tente novamente mais tarde.'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-page">
            <Header initialActiveLink="#/admin" />
            <div className="login-page-content">
                {isCheckingSession || sessionRestored ? (
                    <p role="status">
                        {sessionRestored ? 'Sessão restaurada. Redirecionando...' : 'Verificando sessão...'}
                    </p>
                ) : (
                    <LoginPainel
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        errorMessage={errorMessage}
                    />
                )}
            </div>
        </div>
    )
}

export default LoginPage
import { useEffect, useState, type ReactNode } from 'react'
import { restoreSession } from '../services/api'
import { AUTH_STATE_CHANGE_EVENT, isAuthenticated } from '../services/authToken'
import { getUserFacingError } from '../services/errors'

type AuthGateProps = {
    children: ReactNode
    fallback: ReactNode
}

const AuthGate = ({ children, fallback }: AuthGateProps) => {
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        const syncAuthState = () => {
            if (active) setStatus(isAuthenticated() ? 'authenticated' : 'unauthenticated')
        }
        window.addEventListener(AUTH_STATE_CHANGE_EVENT, syncAuthState)

        void restoreSession()
            .then((authenticated) => {
                if (active) setStatus(authenticated ? 'authenticated' : 'unauthenticated')
            })
            .catch((error: unknown) => {
                if (!active) return
                setErrorMessage(getUserFacingError(error, 'Não foi possível restaurar a sessão. Tente novamente.'))
                setStatus('error')
            })

        return () => {
            active = false
            window.removeEventListener(AUTH_STATE_CHANGE_EVENT, syncAuthState)
        }
    }, [])

    if (status === 'loading') return <p role="status">Restaurando sessão...</p>
    if (status === 'error') return <p role="alert">{errorMessage}</p>
    return status === 'authenticated' ? <>{children}</> : <>{fallback}</>
}

export default AuthGate
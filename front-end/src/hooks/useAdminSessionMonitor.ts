import { navigate } from '../services/navigation'
import { useEffect } from 'react'
import { restoreAdminProfile } from '../services/api'
import { getAccessToken, getAdminAccessIssue, getAdminId } from '../services/authToken'

export function useAdminSessionMonitor(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return
        let active = true
        let checking = false
        const checkAccess = async () => {
            if (checking || document.hidden || !getAccessToken() || !getAdminId() || getAdminAccessIssue()) return
            checking = true
            try {
                const profile = await restoreAdminProfile()
                if (active && !profile && !getAdminAccessIssue()) navigate('/admin/login')
            } catch {
                // The API handles lost access globally; temporary connection errors preserve the session.
            } finally { checking = false }
        }
        const checkWhenVisible = () => { if (!document.hidden) void checkAccess() }
        const timer = window.setInterval(() => void checkAccess(), 30_000)
        window.addEventListener('focus', checkWhenVisible)
        document.addEventListener('visibilitychange', checkWhenVisible)
        return () => {
            active = false
            window.clearInterval(timer)
            window.removeEventListener('focus', checkWhenVisible)
            document.removeEventListener('visibilitychange', checkWhenVisible)
        }
    }, [enabled])
}

import { useEffect, useState } from 'react'

type LoadResult<T> =
    | { status: 'loading' | 'error'; data?: undefined }
    | { status: 'ready'; data: T }

export type DashboardData<T> = LoadResult<T> & { retry: () => void }

export function useDashboardData<T>(load: (signal: AbortSignal) => Promise<T>): DashboardData<T> {
    const [result, setResult] = useState<LoadResult<T>>({ status: 'loading' })
    const [attempt, setAttempt] = useState(0)
    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal).then(data => {
            if (!controller.signal.aborted) setResult({ status: 'ready', data })
        }).catch(() => {
            if (!controller.signal.aborted) setResult({ status: 'error' })
        })
        return () => controller.abort()
    }, [load, attempt])
    function retry() {
        setResult({ status: 'loading' })
        setAttempt(current => current + 1)
    }
    return { ...result, retry }
}

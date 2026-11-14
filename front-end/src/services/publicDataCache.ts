export type PublicDataCacheScope = 'events' | 'business-info'

const CACHE_TTL_MS = 30_000
const CACHE_PREFIX = 'brotando-feiras-public-api-v1:'
const INVALIDATION_KEY = 'brotando-feiras-public-api-invalidation'
const MAX_MEMORY_ENTRIES = 24
const MAX_MEMORY_VALUE_LENGTH = 2_000_000
const MAX_MEMORY_TOTAL_LENGTH = 3_000_000
const MAX_SESSION_ENTRIES = 10
const MAX_SESSION_VALUE_LENGTH = 120_000

type MemoryEntry = {
    scope: PublicDataCacheScope
    expiresAt: number
    serializedValue: string
}

type StoredEntry = {
    version: 1
    scope: PublicDataCacheScope
    expiresAt: number
    value: unknown
}

const memoryCache = new Map<string, MemoryEntry>()
const pendingReads = new Map<string, { scope: PublicDataCacheScope; promise: Promise<unknown> }>()
const scopeGeneration: Record<PublicDataCacheScope, number> = { events: 0, 'business-info': 0 }
let memoryValueLength = 0

function splitEndpoint(endpoint: string) {
    const normalized = endpoint.replace(/^\/+/, '')
    const queryIndex = normalized.indexOf('?')
    const pathname = (queryIndex < 0 ? normalized : normalized.slice(0, queryIndex)).replace(/\/+$/, '')
    return { pathname, key: normalized }
}

function cacheScopeForRead(pathname: string): PublicDataCacheScope | null {
    if (pathname === 'business-info') return 'business-info'
    if (pathname === 'event' || pathname === 'event/nearest' || pathname === 'event/agenda') return 'events'
    if (/^event\/(?!admin$|locations(?:\/|$)|image(?:\/|$))[^/]+$/.test(pathname)) return 'events'
    if (/^event\/image\/[^/]+$/.test(pathname) && pathname !== 'event/image/file') return 'events'
    return null
}

export function getPublicDataCacheTarget(endpoint: string, method = 'GET'):
    { key: string; scope: PublicDataCacheScope } | null {
    if (method.toUpperCase() !== 'GET') return null
    const { pathname, key } = splitEndpoint(endpoint)
    const scope = cacheScopeForRead(pathname)
    return scope ? { key: `${scope}:${key}`, scope } : null
}

export function getPublicDataInvalidationScope(endpoint: string, method: string): PublicDataCacheScope | null {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) return null
    const { pathname } = splitEndpoint(endpoint)
    if (pathname === 'business-info') return 'business-info'
    if (pathname === 'event/create' || /^event\/[^/]+$/.test(pathname)) return 'events'
    if (pathname === 'event/image/create' || /^event\/image\/[^/]+$/.test(pathname)) return 'events'
    return null
}

function getSessionStorage(): Storage | null {
    try {
        return typeof window === 'undefined' ? null : window.sessionStorage
    } catch {
        return null
    }
}

function getLocalStorage(): Storage | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage
    } catch {
        return null
    }
}

function sessionKey(key: string) {
    return `${CACHE_PREFIX}${encodeURIComponent(key)}`
}

function removeSessionEntry(key: string) {
    try {
        getSessionStorage()?.removeItem(sessionKey(key))
    } catch {
        // Storage is optional; the in-memory cache still works.
    }
}

function rememberInMemory(key: string, entry: MemoryEntry) {
    const previous = memoryCache.get(key)
    if (previous) memoryValueLength -= previous.serializedValue.length
    memoryCache.delete(key)
    memoryCache.set(key, entry)
    memoryValueLength += entry.serializedValue.length

    while (memoryCache.size > MAX_MEMORY_ENTRIES || memoryValueLength > MAX_MEMORY_TOTAL_LENGTH) {
        const oldest = memoryCache.keys().next().value as string | undefined
        if (!oldest) break
        const removed = memoryCache.get(oldest)
        if (removed) memoryValueLength -= removed.serializedValue.length
        memoryCache.delete(oldest)
    }
}

function readCachedValue(key: string, scope: PublicDataCacheScope): { hit: true; value: unknown } | { hit: false } {
    const now = Date.now()
    const inMemory = memoryCache.get(key)
    if (inMemory && inMemory.expiresAt > now && inMemory.scope === scope) {
        memoryCache.delete(key)
        memoryCache.set(key, inMemory)
        try {
            return { hit: true, value: JSON.parse(inMemory.serializedValue) as unknown }
        } catch {
            memoryCache.delete(key)
            memoryValueLength -= inMemory.serializedValue.length
        }
    } else if (inMemory) {
        memoryCache.delete(key)
        memoryValueLength -= inMemory.serializedValue.length
        if (inMemory.expiresAt <= now) removeSessionEntry(key)
    }

    const storage = getSessionStorage()
    if (!storage) return { hit: false }
    try {
        const storageId = sessionKey(key)
        const raw = storage.getItem(storageId)
        if (!raw) return { hit: false }
        const entry = JSON.parse(raw) as Partial<StoredEntry>
        if (entry.version !== 1 || entry.scope !== scope || typeof entry.expiresAt !== 'number' || !('value' in entry)) {
            storage.removeItem(storageId)
            return { hit: false }
        }
        if (entry.expiresAt <= now) {
            storage.removeItem(storageId)
            return { hit: false }
        }
        const serializedValue = JSON.stringify(entry.value)
        if (typeof serializedValue !== 'string' || serializedValue.length > MAX_MEMORY_VALUE_LENGTH) {
            storage.removeItem(storageId)
            return { hit: false }
        }
        rememberInMemory(key, { scope, expiresAt: entry.expiresAt, serializedValue })
        return { hit: true, value: JSON.parse(serializedValue) as unknown }
    } catch {
        return { hit: false }
    }
}

function pruneSessionStorage(storage: Storage, currentKey: string) {
    const entries: Array<{ key: string; expiresAt: number }> = []
    const now = Date.now()
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (!key?.startsWith(CACHE_PREFIX)) continue
        try {
            const parsed = JSON.parse(storage.getItem(key) ?? 'null') as Partial<StoredEntry> | null
            if (!parsed || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= now) {
                storage.removeItem(key)
                index--
                continue
            }
            entries.push({ key, expiresAt: parsed.expiresAt })
        } catch {
            storage.removeItem(key)
            index--
        }
    }
    entries.sort((left, right) => left.expiresAt - right.expiresAt)
    while (entries.length >= MAX_SESSION_ENTRIES && !entries.some(entry => entry.key === currentKey)) {
        const oldest = entries.shift()
        if (oldest) storage.removeItem(oldest.key)
    }
}

function storeCachedValue(key: string, scope: PublicDataCacheScope, value: unknown, generation: number) {
    if (scopeGeneration[scope] !== generation) return
    try {
        const serializedValue = JSON.stringify(value)
        if (typeof serializedValue !== 'string' || serializedValue.length > MAX_MEMORY_VALUE_LENGTH) return
        const expiresAt = Date.now() + CACHE_TTL_MS
        rememberInMemory(key, { scope, expiresAt, serializedValue })

        if (serializedValue.length > MAX_SESSION_VALUE_LENGTH) return
        const storage = getSessionStorage()
        if (!storage) return
        const storageId = sessionKey(key)
        pruneSessionStorage(storage, storageId)
        const entry: StoredEntry = { version: 1, scope, expiresAt, value: JSON.parse(serializedValue) as unknown }
        storage.setItem(storageId, JSON.stringify(entry))
    } catch {
        // Quota limits and disabled browser storage do not affect the request.
    }
}

function abortError(signal: AbortSignal) {
    return signal.reason ?? new DOMException('A operação foi cancelada.', 'AbortError')
}

function waitForCaller<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return promise
    if (signal.aborted) return Promise.reject(abortError(signal))
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => {
            signal.removeEventListener('abort', onAbort)
            reject(abortError(signal))
        }
        signal.addEventListener('abort', onAbort, { once: true })
        promise.then(value => {
            signal.removeEventListener('abort', onAbort)
            resolve(value)
        }, error => {
            signal.removeEventListener('abort', onAbort)
            reject(error)
        })
    })
}

export async function getOrLoadPublicData<T>(
    key: string,
    scope: PublicDataCacheScope,
    loader: () => Promise<T>,
    signal?: AbortSignal,
): Promise<T> {
    if (signal?.aborted) throw abortError(signal)
    const cached = readCachedValue(key, scope)
    if (cached.hit) return cached.value as T

    let pending = pendingReads.get(key)?.promise as Promise<T> | undefined
    if (!pending) {
        const generation = scopeGeneration[scope]
        let request: Promise<T>
        request = loader().then(value => {
            storeCachedValue(key, scope, value, generation)
            return value
        }).finally(() => {
            if (pendingReads.get(key)?.promise === request) pendingReads.delete(key)
        })
        pendingReads.set(key, { scope, promise: request })
        pending = request
    }

    const value = await waitForCaller(pending, signal)
    return JSON.parse(JSON.stringify(value)) as T
}

function clearLocalCache(scope?: PublicDataCacheScope) {
    if (scope) scopeGeneration[scope]++
    else {
        scopeGeneration.events++
        scopeGeneration['business-info']++
    }

    for (const [key, entry] of memoryCache) {
        if (!scope || entry.scope === scope) {
            memoryValueLength -= entry.serializedValue.length
            memoryCache.delete(key)
        }
    }
    for (const [key, pending] of pendingReads) {
        if (!scope || pending.scope === scope) pendingReads.delete(key)
    }

    const storage = getSessionStorage()
    if (!storage) return
    try {
        for (let index = 0; index < storage.length; index++) {
            const key = storage.key(index)
            if (!key?.startsWith(CACHE_PREFIX)) continue
            if (!scope) {
                storage.removeItem(key)
                index--
                continue
            }
            try {
                const entry = JSON.parse(storage.getItem(key) ?? 'null') as Partial<StoredEntry> | null
                if (!entry || entry.scope === scope) {
                    storage.removeItem(key)
                    index--
                }
            } catch {
                storage.removeItem(key)
                index--
            }
        }
    } catch {
        // Storage is optional; all in-memory values have already been cleared.
    }
}

export function invalidatePublicDataCache(scope: PublicDataCacheScope) {
    clearLocalCache(scope)
    try {
        getLocalStorage()?.setItem(INVALIDATION_KEY, JSON.stringify({
            scope,
            nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }))
    } catch {
        // Cross-tab invalidation is best effort when localStorage is unavailable.
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', event => {
        if (event.key !== INVALIDATION_KEY || !event.newValue) return
        try {
            const payload = JSON.parse(event.newValue) as { scope?: unknown }
            const scope = payload.scope === 'events' || payload.scope === 'business-info'
                ? payload.scope
                : undefined
            clearLocalCache(scope)
        } catch {
            clearLocalCache()
        }
    })
}

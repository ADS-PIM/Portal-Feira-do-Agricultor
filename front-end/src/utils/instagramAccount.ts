export const INSTAGRAM_ERROR_MESSAGES = {
    BUSINESS_INSTAGRAM_INVALID: 'Informe um nome de usuário válido, como @brotando.feiras.',
    BUSINESS_INSTAGRAM_EMPTY: 'Informe o nome de usuário após o @.',
    BUSINESS_INSTAGRAM_MISSING_AT: 'Comece o nome de usuário com @, como @brotando.feiras.',
    BUSINESS_INSTAGRAM_TOO_LONG: 'Use no máximo 30 caracteres no nome de usuário, sem contar o @.',
    BUSINESS_INSTAGRAM_SPACES: 'Remova os espaços do nome de usuário.',
    BUSINESS_INSTAGRAM_AT_SIGN: 'Use o @ apenas uma vez, no início do nome de usuário.',
    BUSINESS_INSTAGRAM_ACCENTS: 'Use letras sem acentos no nome de usuário.',
    BUSINESS_INSTAGRAM_CHARACTERS: 'Use apenas letras, números, pontos (.) e sublinhados (_).',
    BUSINESS_INSTAGRAM_START_DOT: 'O nome de usuário não pode começar com ponto.',
    BUSINESS_INSTAGRAM_END_DOT: 'O nome de usuário não pode terminar com ponto.',
    BUSINESS_INSTAGRAM_REPEATED_DOTS: 'Use apenas um ponto por vez, sem pontos seguidos.',
} as const

export function normalizeInstagramAccount(value: string): string {
    return value.trim().toLowerCase()
}

export function getInstagramAccountError(value: unknown) {
    const error = (code: keyof typeof INSTAGRAM_ERROR_MESSAGES) => ({ code, message: INSTAGRAM_ERROR_MESSAGES[code] })
    if (typeof value !== 'string') return error('BUSINESS_INSTAGRAM_INVALID')
    const account = value.trim()
    if (!account) return null // An empty optional contact is removed when saving.
    if (!account.startsWith('@')) return error('BUSINESS_INSTAGRAM_MISSING_AT')
    const username = account.replace(/^@/, '')

    // Return only the first applicable rule; the next one appears after correction.
    if (!username) return error('BUSINESS_INSTAGRAM_EMPTY')
    if (Array.from(username).length > 30) return error('BUSINESS_INSTAGRAM_TOO_LONG')
    if (/\s/.test(username)) return error('BUSINESS_INSTAGRAM_SPACES')
    if (username.includes('@')) return error('BUSINESS_INSTAGRAM_AT_SIGN')
    if (/\p{M}/u.test(username.normalize('NFD'))) return error('BUSINESS_INSTAGRAM_ACCENTS')
    if (!/^[a-z0-9._]+$/i.test(username)) return error('BUSINESS_INSTAGRAM_CHARACTERS')
    if (username.startsWith('.')) return error('BUSINESS_INSTAGRAM_START_DOT')
    if (username.endsWith('.')) return error('BUSINESS_INSTAGRAM_END_DOT')
    if (username.includes('..')) return error('BUSINESS_INSTAGRAM_REPEATED_DOTS')
    return null
}

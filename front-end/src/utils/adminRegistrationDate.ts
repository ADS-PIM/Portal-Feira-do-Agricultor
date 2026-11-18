export function registrationTime(value?: string | null): number {
    if (!value) return Number.NEGATIVE_INFINITY
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T12:00:00Z`)
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
            ? date.getTime() : Number.NEGATIVE_INFINITY
    }
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY
}

export function formatRegistrationDate(value?: string | null): string {
    const time = registrationTime(value)
    if (!Number.isFinite(time)) return 'Data de cadastro indisponível'
    return new Intl.DateTimeFormat('pt-BR', {
        timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value!) ? 'UTC' : 'America/Sao_Paulo',
        day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(time)).replace('.', '')
}

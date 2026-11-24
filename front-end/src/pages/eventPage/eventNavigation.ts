import { adminSectionReturnLabels, getAdminSection } from '../../services/adminNavigation'
import { getNavigationReturnPath } from '../../services/navigation'

type DatedEvent = { id: string; date: string; startAt: string }

export function getEventReturnTarget() {
    const href = getNavigationReturnPath('/calendario')
    const pathname = href.split(/[?#]/)[0]
    let label = 'Voltar à página anterior'
    if (pathname === '/calendario') label = 'Voltar para o Calendário'
    else if (pathname === '/') label = 'Voltar para o início'
    else if (pathname === '/minha-conta') label = 'Voltar à minha conta'
    else if (pathname.startsWith('/evento/')) label = 'Voltar ao evento'
    else if (pathname === '/admin' || pathname === '/admin/dashboard' || pathname === '/admin/eventos') {
        label = adminSectionReturnLabels[getAdminSection(href.split('#')[0])]
    }
    return { href, label }
}

function dateTime(event: DatedEvent): string {
    return `${event.date.slice(0, 10)}T${event.startAt.slice(0, 8).padEnd(8, ':00')}`
}

export function getAdjacentEvents<T extends DatedEvent>(events: T[], current: DatedEvent) {
    const currentTime = dateTime(current)
    let previous: T | null = null
    let next: T | null = null

    for (const candidate of events) {
        if (candidate.id === current.id) continue
        const candidateTime = dateTime(candidate)
        if (candidateTime < currentTime && (!previous || candidateTime > dateTime(previous)
            || (candidateTime === dateTime(previous) && candidate.id < previous.id))) {
            previous = candidate
        }
        if (candidateTime > currentTime && (!next || candidateTime < dateTime(next)
            || (candidateTime === dateTime(next) && candidate.id < next.id))) {
            next = candidate
        }
    }

    return { previous, next }
}

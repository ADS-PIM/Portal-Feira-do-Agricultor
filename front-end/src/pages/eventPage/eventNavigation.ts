type DatedEvent = { id: string; date: string; startAt: string }

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

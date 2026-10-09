type EventHours = { startAt: string; endAt: string }

export function matchesEventTimeRange(event: EventHours, from: string, to: string): boolean {
    const startsAt = event.startAt.slice(0, 5)
    const endsAt = event.endAt.slice(0, 5)

    return (!from || startsAt >= from) && (!to || endsAt <= to)
}

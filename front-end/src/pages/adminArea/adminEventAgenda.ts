import type { AdminEventWithAuthor as AdminEvent } from '../../services/eventService'

export const EVENTS_PAGE_SIZE = 12
export const MONTH_OPTIONS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
].map((label, index) => ({ value: String(index + 1).padStart(2, '0'), label }))

const eventDateFormat = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export function formatEventDate(date: string): string {
    return eventDateFormat.format(new Date(`${date.slice(0, 10)}T12:00:00`))
}

type EventYear = {
    year: string
    past: boolean
    months: { key: string; events: AdminEvent[] }[]
}

const fairClock = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function getFairDateTime(now: Date): string {
    const parts = fairClock.formatToParts(now)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

export function groupAdminEvents(events: AdminEvent[], now: Date, limit: number, offset = 0): EventYear[] {
    const currentTime = getFairDateTime(now)
    const currentMonth = currentTime.slice(0, 7)

    const byMonth = new Map<string, AdminEvent[]>()
    for (const event of events) {
        const key = event.date.slice(0, 7)
        const month = byMonth.get(key)
        if (month) month.push(event)
        else byMonth.set(key, [event])
    }

    const months = [...byMonth].sort(([first], [second]) => {
        const firstPast = first < currentMonth
        const secondPast = second < currentMonth
        if (firstPast !== secondPast) return firstPast ? 1 : -1
        return firstPast ? second.localeCompare(first) : first.localeCompare(second)
    })

    const years: EventYear[] = []
    let remaining = limit
    let toSkip = offset
    for (const [key, monthEvents] of months) {
        if (remaining <= 0) break
        if (toSkip >= monthEvents.length) {
            toSkip -= monthEvents.length
            continue
        }
        const past = key < currentMonth
        const year = key.slice(0, 4)
        let group = years.at(-1)
        if (group?.year !== year || group.past !== past) {
            group = { year, past, months: [] }
            years.push(group)
        }

        const ordered = monthEvents.sort((first, second) => {
            const firstDate = first.date.slice(0, 10)
            const secondDate = second.date.slice(0, 10)
            const firstEnded = `${firstDate}T${first.endAt.slice(0, 5)}` <= currentTime
            const secondEnded = `${secondDate}T${second.endAt.slice(0, 5)}` <= currentTime
            if (firstEnded !== secondEnded) return firstEnded ? 1 : -1
            const order = firstDate.localeCompare(secondDate) || first.startAt.localeCompare(second.startAt)
            return (firstEnded ? -order : order) || first.id.localeCompare(second.id)
        })
        const visible = ordered.slice(toSkip, toSkip + remaining)
        toSkip = 0
        group.months.push({ key, events: visible })
        remaining -= visible.length
    }
    return years
}

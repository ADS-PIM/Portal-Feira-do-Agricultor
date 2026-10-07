export const weekdays = [
    { id: 'mon', label: 'Seg' },
    { id: 'tue', label: 'Ter' },
    { id: 'wed', label: 'Qua' },
    { id: 'thu', label: 'Qui' },
    { id: 'fri', label: 'Sex' },
    { id: 'sat', label: 'Sáb' },
    { id: 'sun', label: 'Dom' },
] as const

export type WeekdayId = (typeof weekdays)[number]['id']

export type DayBusinessHours = {
    closed: boolean
    opensAt: string
    closesAt: string
}

export type WeeklyBusinessHours = Record<WeekdayId, DayBusinessHours>

export function createEmptyWeeklyBusinessHours(): WeeklyBusinessHours {
    return Object.fromEntries(
        weekdays.map(({ id }) => [id, { closed: true, opensAt: '', closesAt: '' }]),
    ) as WeeklyBusinessHours
}

export function parseWeeklyBusinessHours(value: string | null | undefined): WeeklyBusinessHours | null {
    if (!value?.trim()) return createEmptyWeeklyBusinessHours()

    const result = createEmptyWeeklyBusinessHours()
    const assignedDays = new Set<WeekdayId>()
    const entries = value.split(';').map((entry) => entry.trim()).filter(Boolean)

    if (!entries.length) return null

    for (const entry of entries) {
        const match = entry.match(/^(.+?):\s*(Não atendemos|(\d{2}:\d{2})\s+às?\s+(\d{2}:\d{2}))$/i)
        if (!match) return null

        const dayRange = match[1].trim().split('-')
        const firstIndex = weekdays.findIndex(({ label }) => label.toLowerCase() === dayRange[0].trim().toLowerCase())
        const lastIndex = dayRange.length === 2
            ? weekdays.findIndex(({ label }) => label.toLowerCase() === dayRange[1].trim().toLowerCase())
            : firstIndex

        if (dayRange.length > 2 || firstIndex < 0 || lastIndex < firstIndex) return null

        for (let index = firstIndex; index <= lastIndex; index += 1) {
            const day = weekdays[index]
            if (assignedDays.has(day.id)) return null
            assignedDays.add(day.id)

            result[day.id] = match[2].toLowerCase() === 'não atendemos'
                ? { closed: true, opensAt: '', closesAt: '' }
                : { closed: false, opensAt: match[3], closesAt: match[4] }
        }
    }

    return assignedDays.size === weekdays.length ? result : null
}

export function validateWeeklyBusinessHours(hours: WeeklyBusinessHours): string | null {
    for (const day of weekdays) {
        const schedule = hours[day.id]
        if (schedule.closed) continue

        if (!schedule.opensAt || !schedule.closesAt) {
            return `Informe o horário de início e término de ${day.label}, ou marque que não há atendimento.`
        }

        if (schedule.closesAt <= schedule.opensAt) {
            return `O horário de término de ${day.label} deve ser posterior ao horário de início.`
        }
    }

    return null
}

export function formatWeeklyBusinessHours(hours: WeeklyBusinessHours): string {
    const groups: { start: number; end: number; schedule: DayBusinessHours }[] = []

    weekdays.forEach(({ id }, index) => {
        const schedule = hours[id]
        const previous = groups[groups.length - 1]
        const sameSchedule = previous && previous.schedule.closed === schedule.closed &&
            previous.schedule.opensAt === schedule.opensAt &&
            previous.schedule.closesAt === schedule.closesAt

        if (sameSchedule) {
            previous.end = index
        } else {
            groups.push({ start: index, end: index, schedule })
        }
    })

    return groups.map(({ start, end, schedule }) => {
        const range = start === end
            ? weekdays[start].label
            : `${weekdays[start].label}-${weekdays[end].label}`
        const hoursText = schedule.closed
            ? 'Não atendemos'
            : `${schedule.opensAt} às ${schedule.closesAt}`
        return `${range}: ${hoursText}`
    }).join('; ')
}

export function getBusinessHoursLines(value: string | null | undefined): string[] {
    return value?.split(/[;\n]/).map((line) => line.trim()).filter(Boolean) ?? []
}

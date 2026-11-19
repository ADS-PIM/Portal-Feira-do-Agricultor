export const MIN_FILTER_YEAR = 2019

export function getCalendarYears(visibleYear: number): number[] {
    const lastYear = visibleYear + 50
    return Array.from({ length: lastYear - MIN_FILTER_YEAR + 1 }, (_, index) => MIN_FILTER_YEAR + index)
}

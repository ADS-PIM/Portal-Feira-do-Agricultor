// Event dates and hours are civil times in Brazil, regardless of the server's TZ.
const eventTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
});

export function eventLocalTimestamp(now: Date): string {
    const parts = eventTimeFormatter.formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
    return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`;
}

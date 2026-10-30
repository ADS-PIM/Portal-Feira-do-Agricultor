export type Coordinates = { latitude: number; longitude: number }

export function getCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
    const parse = (value: unknown) => typeof value === 'number' ? value
        : typeof value === 'string' && value.trim() ? Number(value) : NaN
    const lat = parse(latitude), lng = parse(longitude)
    return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180
        ? { latitude: lat, longitude: lng } : null
}

export function getDirectionsUrl(coordinates: Coordinates | null, address: string | null): string | null {
    const destination = coordinates ? `${coordinates.latitude},${coordinates.longitude}` : address?.trim()
    return destination ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination })}` : null
}

export function validCoordinatePair(latitude: unknown, longitude: unknown): boolean {
    if (latitude === undefined && longitude === undefined) return true;
    if (latitude === null && longitude === null) return true;
    return typeof latitude === 'number' && Number.isFinite(latitude) && Math.abs(latitude) <= 90
        && typeof longitude === 'number' && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

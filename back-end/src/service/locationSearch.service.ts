export type LocationResult = { address: string; latitude: number; longitude: number };

export function parsePhotonResults(payload: unknown): LocationResult[] {
    if (!payload || typeof payload !== 'object' || !('features' in payload) || !Array.isArray(payload.features)) {
        throw new Error('Invalid geocoding response');
    }
    const results: LocationResult[] = [];
    for (const feature of payload.features.slice(0, 8)) {
        const coords = feature?.geometry?.coordinates;
        const props = feature?.properties;
        if (feature?.geometry?.type !== 'Point' || !Array.isArray(coords) || !props) continue;
        const [longitude, latitude] = coords;
        if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90
            || typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) continue;
        const street = [props.street, props.housenumber].filter(part => typeof part === 'string' && part.trim()).join(', ');
        const parts = [props.name, street, props.district, props.city || props.county, props.state, props.country]
            .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()));
        const address = [...new Set(parts.map(part => part.trim()))].join(', ').slice(0, 255);
        if (address) results.push({ address, latitude, longitude });
    }
    return results;
}

export class LocationSearchService {
    private cache = new Map<string, { expiresAt: number; results: LocationResult[] }>();
    private pending = new Map<string, Promise<LocationResult[]>>();

    constructor(private request: typeof fetch = fetch) {}

    async search(query: string): Promise<LocationResult[]> {
        const baseUrl = process.env.LOCATION_SEARCH_URL || 'https://photon.komoot.io/api/';
        const key = `${baseUrl}:${query.toLocaleLowerCase('pt-BR')}`;
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) return cached.results;
        const pending = this.pending.get(key);
        if (pending) return pending;
        const task = this.fetchResults(baseUrl, query).then(results => {
            if (this.cache.size >= 256) this.cache.delete(this.cache.keys().next().value!);
            this.cache.set(key, { results, expiresAt: Date.now() + 15 * 60_000 });
            return results;
        }).finally(() => this.pending.delete(key));
        this.pending.set(key, task);
        return task;
    }

    private async fetchResults(baseUrl: string, query: string): Promise<LocationResult[]> {
        // Only the server configuration controls the provider; clients supply text, never a URL.
        const url = new URL(baseUrl);
        if (url.protocol !== 'https:') throw new Error('Location provider must use HTTPS');
        url.searchParams.set('q', query);
        url.searchParams.set('limit', '8');
        const response = await this.request(url, {
            headers: { Accept: 'application/json', 'User-Agent': 'PortalFeiraDoAgricultor/1.0 (event-location-search)' },
            signal: AbortSignal.timeout(8000),
            redirect: 'error',
        });
        if (!response.ok) throw new Error('Location provider unavailable');
        return parsePhotonResults(await response.json());
    }
}

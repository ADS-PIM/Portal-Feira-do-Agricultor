import { Readable } from 'node:stream';
import { ImageStorageService, ImageUploadError, MAX_IMAGE_BYTES } from './imageStorage.service';
import { isEventImagePathname, LegacyBlobStorageService } from './legacyBlobStorage.service';

export interface ImageMigrationRepository {
    listUrls(): Promise<string[]>;
    replaceUrl(previous: string, next: string): Promise<void>;
}

export function legacyImagePath(value: string): string | null {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash
            || !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/i.test(url.hostname)) return null;
        const pathname = decodeURIComponent(url.pathname.slice(1));
        return isEventImagePathname(pathname) ? pathname : null;
    } catch {
        return null;
    }
}

export async function migrateEventImages(
    repository: ImageMigrationRepository,
    options: {
        apply?: boolean;
        legacy?: LegacyBlobStorageService;
        storage?: ImageStorageService;
        onResult?: (pathname: string, error?: string) => void;
    } = {},
) {
    const legacy = options.legacy ?? new LegacyBlobStorageService();
    const storage = options.storage ?? new ImageStorageService();
    const urls = [...new Set(await repository.listUrls())];
    const candidates = urls.flatMap(url => {
        const pathname = legacyImagePath(url);
        return pathname ? [{ url, pathname }] : [];
    });
    const report = { found: candidates.length, migrated: 0, failed: 0, skipped: urls.length - candidates.length };
    if (!options.apply) return report;

    for (const { url, pathname } of candidates) {
        try {
            // Never fetch arbitrary URLs from database content or another store.
            if (legacy.urlForPathname(pathname) !== url) {
                throw new ImageUploadError(400, 'A foto pertence a outro store Blob.');
            }
            const result = await legacy.read(pathname);
            if (!result || result.statusCode !== 200 || !result.stream) {
                throw new ImageUploadError(404, 'Foto original não encontrada no Blob.');
            }
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of Readable.fromWeb(result.stream)) {
                const buffer = Buffer.from(chunk);
                size += buffer.length;
                if (size > MAX_IMAGE_BYTES) throw new ImageUploadError(413, 'A foto antiga excede 4 MB.');
                chunks.push(buffer);
            }
            // The source URL determines a stable public_id. A retry after a SQL
            // failure reuses the uploaded asset instead of creating duplicates.
            const uploaded = await storage.upload(Buffer.concat(chunks), result.blob.contentType, url);
            await repository.replaceUrl(url, uploaded.url);
            report.migrated++;
            options.onResult?.(pathname);
        } catch (error) {
            report.failed++;
            options.onResult?.(pathname, error instanceof ImageUploadError ? error.message : 'Falha ao migrar a foto; a URL antiga foi preservada.');
        }
    }
    return report;
}

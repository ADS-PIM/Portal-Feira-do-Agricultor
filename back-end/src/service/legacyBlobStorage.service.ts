import { get } from '@vercel/blob';
import { ImageUploadError } from './imageStorage.service';

const imagePathPattern = /^event-images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

export function isEventImagePathname(pathname: unknown): pathname is string {
    return typeof pathname === 'string' && imagePathPattern.test(pathname);
}

// Read-only compatibility while existing photos are migrated to Cloudinary.
export class LegacyBlobStorageService {
    private getConfig() {
        const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
        const storeId = process.env.BLOB_STORE_ID?.trim();
        if (!token || !storeId || !/^store_[a-zA-Z0-9]+$/.test(storeId)) {
            throw new ImageUploadError(503, 'Configure BLOB_STORE_ID e BLOB_READ_WRITE_TOKEN para ler as fotos antigas.');
        }
        return { token, storeId };
    }

    public urlForPathname(pathname: string): string {
        if (!isEventImagePathname(pathname)) {
            throw new ImageUploadError(400, 'Caminho de imagem inválido.');
        }
        const { storeId } = this.getConfig();
        return `https://${storeId.slice('store_'.length).toLowerCase()}.private.blob.vercel-storage.com/${pathname}`;
    }

    public async read(pathname: string, ifNoneMatch?: string) {
        if (!isEventImagePathname(pathname)) {
            throw new ImageUploadError(400, 'Caminho de imagem inválido.');
        }
        const { token } = this.getConfig();
        return get(pathname, { access: 'private', token, ifNoneMatch });
    }
}

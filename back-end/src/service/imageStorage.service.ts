import { randomUUID } from 'node:crypto';

// Load Vercel Blob lazily to avoid crashing the whole backend if the package or
// storage configuration is not available at boot time.
type BlobModule = typeof import('@vercel/blob');

let blobModule: BlobModule | undefined;
try {
    blobModule = require('@vercel/blob') as BlobModule;
} catch {
    blobModule = undefined;
}

const missingBlobClient = {
    put: async () => {
        throw new ImageUploadError(500, 'O armazenamento de imagens não está configurado. Configure BLOB_STORE_ID e BLOB_READ_WRITE_TOKEN.');
    },
    get: async () => {
        throw new ImageUploadError(500, 'O armazenamento de imagens não está configurado. Configure BLOB_STORE_ID e BLOB_READ_WRITE_TOKEN.');
    },
};

// Leave room below the 4.5 MB request limit of Vercel Functions.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const imagePathPattern = /^event-images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;

export function isEventImagePathname(pathname: unknown): pathname is string {
    return typeof pathname === 'string' && imagePathPattern.test(pathname);
}

export class ImageUploadError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

function getBlobConfig() {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    const storeId = process.env.BLOB_STORE_ID?.trim();
    if (!token || !storeId || !/^store_[a-zA-Z0-9]+$/.test(storeId)) {
        throw new Error('Configure BLOB_STORE_ID e BLOB_READ_WRITE_TOKEN no backend.');
    }
    return { token, storeId };
}

export class ImageStorageService {
    constructor(
        private readonly client = blobModule ? { put: blobModule.put, get: blobModule.get } : missingBlobClient,
        private readonly getConfig = getBlobConfig,
    ) {}

    public async upload(image: unknown, contentType?: string): Promise<{ url: string }> {
        const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : null;
        if (!extension || !Buffer.isBuffer(image) || image.length === 0) {
            throw new ImageUploadError(400, 'Selecione uma imagem JPG ou PNG.');
        }
        if (image.length > MAX_IMAGE_BYTES) {
            throw new ImageUploadError(413, 'A imagem deve ter no máximo 4 MB.');
        }
        const hasValidSignature = extension === 'jpg'
            ? image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
            : image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        if (!hasValidSignature) {
            throw new ImageUploadError(400, 'O arquivo não corresponde a uma imagem JPG ou PNG válida.');
        }

        const { token } = this.getConfig();
        const blob = await this.client.put(`event-images/${randomUUID()}.${extension}`, image, {
            access: 'private',
            contentType,
            addRandomSuffix: false,
            allowOverwrite: false,
            token,
        });
        return { url: blob.url };
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
        return this.client.get(pathname, { access: 'private', token, ifNoneMatch });
    }
}

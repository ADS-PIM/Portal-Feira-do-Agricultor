import { createHash, randomUUID } from 'node:crypto';
import type { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

// Leave room below the request limit of Vercel Functions.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export class ImageUploadError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

type CloudinaryClient = Pick<typeof cloudinary.uploader, 'upload_stream'>;
let cloudinaryClient: CloudinaryClient | undefined;

function loadCloudinaryClient(): CloudinaryClient {
    if (cloudinaryClient) return cloudinaryClient;
    // The SDK parses CLOUDINARY_URL at import time, even when it is empty.
    // Load only on upload and use our validated, per-request credentials.
    // require is synchronous; restore the environment before yielding control.
    const environmentUrl = process.env.CLOUDINARY_URL;
    try {
        delete process.env.CLOUDINARY_URL;
        cloudinaryClient = (require('cloudinary') as typeof import('cloudinary')).v2.uploader;
        return cloudinaryClient;
    } finally {
        if (environmentUrl !== undefined) process.env.CLOUDINARY_URL = environmentUrl;
    }
}

export function getCloudinaryConfig(env: NodeJS.ProcessEnv = process.env) {
    let cloud_name = env.CLOUDINARY_CLOUD_NAME?.trim();
    let api_key = env.CLOUDINARY_API_KEY?.trim();
    let api_secret = env.CLOUDINARY_API_SECRET?.trim();

    // A partial set must not silently select another environment's URL.
    if (!cloud_name && !api_key && !api_secret && env.CLOUDINARY_URL?.trim()) {
        try {
            const url = new URL(env.CLOUDINARY_URL.trim());
            if (url.protocol !== 'cloudinary:' || url.port || url.search || url.hash || !['', '/'].includes(url.pathname)) {
                throw new Error('Invalid URL');
            }
            cloud_name = url.hostname;
            api_key = decodeURIComponent(url.username);
            api_secret = decodeURIComponent(url.password);
        } catch {
            throw new ImageUploadError(503, 'CLOUDINARY_URL inválida. Use cloudinary://API_KEY:API_SECRET@CLOUD_NAME no backend.');
        }
    }

    if (!cloud_name || !/^[a-zA-Z0-9_-]+$/.test(cloud_name) || !api_key || !api_secret) {
        throw new ImageUploadError(503, 'Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET (ou CLOUDINARY_URL) no backend.');
    }
    return { cloud_name, api_key, api_secret, secure: true as const };
}

export class ImageStorageService {
    constructor(
        private readonly client?: CloudinaryClient,
        private readonly getConfig = getCloudinaryConfig,
    ) {}

    public async upload(image: unknown, contentType?: string, migrationSource?: string): Promise<{ url: string }> {
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

        const config = this.getConfig();
        const publicId = migrationSource
            ? `event-images/migrated/${createHash('sha256').update(migrationSource).digest('hex')}`
            : `event-images/${randomUUID()}`;
        const options: UploadApiOptions = {
            ...config,
            public_id: publicId,
            resource_type: 'image',
            type: 'upload',
            overwrite: false,
            unique_filename: false,
            allowed_formats: ['jpg', 'png'],
            timeout: 60000,
            // Keep the original intact. Responsive derivatives are generated
            // directly from it on demand, then cached by Cloudinary's CDN.
            // f_auto belongs in delivery URLs, never in upload transformations.
        };

        let result: UploadApiResponse;
        try {
            const client = this.client ?? loadCloudinaryClient();
            result = await new Promise<UploadApiResponse>((resolve, reject) => {
                const stream = client.upload_stream(options, (error, uploaded) => {
                    if (error) reject(error);
                    else if (!uploaded?.secure_url) reject(new Error('Missing image URL'));
                    else resolve(uploaded);
                });
                stream.on('error', reject);
                stream.end(image);
            });
        } catch {
            // SDK errors may contain request credentials; never return/log them.
            throw new ImageUploadError(502, 'Não foi possível enviar a imagem ao Cloudinary. Verifique a configuração do armazenamento e tente novamente.');
        }
        return { url: result.secure_url };
    }
}

import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig, ImageUploadError, loadCloudinarySdk } from './imageStorage.service';

export const MAX_DIRECT_IMAGE_BYTES = 10 * 1024 * 1024;
const ticketAudience = 'event-image-upload';
const publicIdPattern = /^event-images\/[0-9a-f-]{36}$/;

export class DirectImageUploadService {
    constructor(
        private readonly getConfig = getCloudinaryConfig,
        private readonly client?: Pick<typeof cloudinary.uploader, 'explicit' | 'destroy'>,
    ) {}

    public authorize(adminId: string, size: unknown, contentType: unknown) {
        if (!['image/jpeg', 'image/png'].includes(String(contentType)) || typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0) {
            throw new ImageUploadError(400, 'Selecione uma imagem JPG ou PNG válida.');
        }
        if (size > MAX_DIRECT_IMAGE_BYTES) throw new ImageUploadError(413, 'Cada imagem deve ter no máximo 10 MB.');
        const config = this.getConfig();
        const timestamp = Math.floor(Date.now() / 1000);
        // Sign only server-selected parameters. The browser cannot change the
        // public ID, format restrictions or overwrite policy without invalidating it.
        const params = {
            allowed_formats: 'jpg,png',
            overwrite: 'false',
            public_id: `event-images/${randomUUID()}`,
            timestamp: String(timestamp),
            type: 'upload',
        };
        const signature = loadCloudinarySdk().utils.api_sign_request(params, config.api_secret);
        const ticket = jwt.sign({ adminId, publicId: params.public_id, cloudName: config.cloud_name }, config.api_secret, {
            algorithm: 'HS256', audience: ticketAudience, expiresIn: '1h',
        });
        return {
            uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`,
            fields: { ...params, api_key: config.api_key, signature },
            ticket,
            expiresAt: (timestamp + 3600) * 1000,
        };
    }

    public async complete(adminId: string, ticket: unknown): Promise<{ url: string }> {
        const config = this.getConfig();
        let publicId: string;
        try {
            if (typeof ticket !== 'string' || ticket.length > 2048) throw new Error('Invalid ticket');
            const payload = jwt.verify(ticket, config.api_secret, { algorithms: ['HS256'], audience: ticketAudience });
            if (typeof payload === 'string' || payload.adminId !== adminId || payload.cloudName !== config.cloud_name
                || typeof payload.publicId !== 'string' || !publicIdPattern.test(payload.publicId)) throw new Error('Invalid ticket');
            publicId = payload.publicId;
        } catch {
            throw new ImageUploadError(400, 'A autorização da foto expirou ou é inválida. Selecione a foto novamente.');
        }
        const client = this.client ?? loadCloudinarySdk().uploader;
        let image;
        try {
            // Read metadata from Cloudinary itself, never trust client-reported
            // byte counts, URLs or formats when completing an upload.
            image = await client.explicit(publicId, { ...config, type: 'upload', resource_type: 'image', timeout: 60000 });
        } catch {
            throw new ImageUploadError(502, 'Não foi possível confirmar a foto enviada. Tente novamente.');
        }
        if (image.public_id !== publicId || image.resource_type !== 'image' || image.type !== 'upload'
            || !['jpg', 'png'].includes(image.format) || !Number.isSafeInteger(image.bytes) || image.bytes <= 0
            || typeof image.secure_url !== 'string' || !image.secure_url.startsWith(`https://res.cloudinary.com/${config.cloud_name}/image/upload/`)) {
            throw new ImageUploadError(400, 'O arquivo enviado não é uma imagem JPG ou PNG válida.');
        }
        if (image.bytes > MAX_DIRECT_IMAGE_BYTES) {
            // This ID was minted for this request and cannot overwrite an existing
            // photo. Clean up oversized assets if a client bypasses local validation.
            await client.destroy(publicId, { ...config, type: 'upload', resource_type: 'image', invalidate: true }).catch(() => {
                console.error('Failed to remove oversized event image.');
            });
            throw new ImageUploadError(413, 'Cada imagem deve ter no máximo 10 MB.');
        }
        return { url: image.secure_url };
    }
}

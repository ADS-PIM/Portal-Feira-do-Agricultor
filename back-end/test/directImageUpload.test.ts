import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { DirectImageUploadService, MAX_DIRECT_IMAGE_BYTES } from '../src/service/directImageUpload.service';
import { ImageUploadError } from '../src/service/imageStorage.service';

const config = { cloud_name: 'test-cloud', api_key: '123', api_secret: 'test-only-secret', secure: true as const };
const isStatus = (status: number) => (error: unknown) => error instanceof ImageUploadError && error.status === status;

test('direct upload accepts 10 MB, rejects invalid files and never exposes the API secret', () => {
    const service = new DirectImageUploadService(() => config);
    for (const size of [4 * 1024 * 1024 + 1, MAX_DIRECT_IMAGE_BYTES]) {
        const authorization = service.authorize('admin-1', size, 'image/png');
        assert.equal(authorization.uploadUrl, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
        assert.equal(authorization.fields.overwrite, 'false');
        assert.equal(authorization.fields.allowed_formats, 'jpg,png');
        assert.match(authorization.fields.signature, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
        assert.ok(!JSON.stringify(authorization).includes(config.api_secret));
        const claims = jwt.verify(authorization.ticket, config.api_secret, { audience: 'event-image-upload' }) as jwt.JwtPayload;
        assert.equal(claims.adminId, 'admin-1');
        assert.equal(claims.publicId, authorization.fields.public_id);
    }
    assert.throws(() => service.authorize('admin-1', MAX_DIRECT_IMAGE_BYTES + 1, 'image/png'), isStatus(413));
    for (const size of [0, -1, 1.5, '123', undefined]) assert.throws(() => service.authorize('admin-1', size, 'image/png'), isStatus(400));
    assert.throws(() => service.authorize('admin-1', 100, 'image/svg+xml'), isStatus(400));
});

test('confirmation checks Cloudinary metadata, administrator and ticket expiry, and can be retried', async () => {
    let bytes = MAX_DIRECT_IMAGE_BYTES;
    let reads = 0;
    const removed: string[] = [];
    const service = new DirectImageUploadService(() => config, {
        explicit: async (publicId: string) => {
            reads++;
            return { public_id: publicId, resource_type: 'image', type: 'upload', format: 'png', bytes,
                secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v123/${publicId}.png` };
        },
        destroy: async (publicId: string) => { removed.push(publicId); return { result: 'ok' }; },
    } as any);
    const auth = service.authorize('admin-1', 1, 'image/png');
    await assert.rejects(service.complete('admin-2', auth.ticket), isStatus(400));
    await assert.rejects(service.complete('admin-1', auth.ticket + 'tampered'), isStatus(400));
    const expired = jwt.sign({ adminId: 'admin-1', publicId: auth.fields.public_id, cloudName: config.cloud_name }, config.api_secret,
        { audience: 'event-image-upload', expiresIn: -1 });
    await assert.rejects(service.complete('admin-1', expired), isStatus(400));
    assert.equal(reads, 0);
    assert.deepEqual(await service.complete('admin-1', auth.ticket), await service.complete('admin-1', auth.ticket));
    assert.equal(removed.length, 0);
    // Authorize a tiny reported size, but check the actual provider size.
    bytes = MAX_DIRECT_IMAGE_BYTES + 1;
    await assert.rejects(service.complete('admin-1', auth.ticket), isStatus(413));
    assert.deepEqual(removed, [auth.fields.public_id]);
});

test('provider errors and unexpected asset metadata never produce a saved URL or expose secrets', async () => {
    for (const result of [null, { public_id: 'another-asset' }]) {
        const service = new DirectImageUploadService(() => config, { explicit: async () => {
            if (!result) throw new Error(config.api_secret);
            return result;
        } } as any);
        const auth = service.authorize('admin-1', 100, 'image/png');
        await assert.rejects(service.complete('admin-1', auth.ticket), (error: unknown) => error instanceof ImageUploadError && !error.message.includes(config.api_secret));
    }
});

import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { type UploadApiOptions, type UploadApiResponse, type UploadStream } from 'cloudinary';
import { getCloudinaryConfig, ImageStorageService, ImageUploadError, MAX_IMAGE_BYTES } from '../src/service/imageStorage.service';
import { LegacyBlobStorageService } from '../src/service/legacyBlobStorage.service';
import { EventImageService } from '../src/service/eventImage.service';
import app from '../src/app';
import { MemoryTokenBucketStore } from '../src/rateLimit/tokenBucket';
import { readPolicies } from '../src/rateLimit/middleware';

const config = { cloud_name: 'test-cloud', api_key: '123456', api_secret: 'test-secret', secure: true as const };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1cAAAAASUVORK5CYII=', 'base64');
const url = 'https://res.cloudinary.com/test-cloud/image/upload/v123/event-images/test.png';

function captureUpload() {
    const calls: { options: UploadApiOptions; bytes: Buffer }[] = [];
    const service = new ImageStorageService({
        upload_stream(options, callback) {
            const chunks: Buffer[] = [];
            return new Writable({
                write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); },
                final(done) {
                    calls.push({ options: options!, bytes: Buffer.concat(chunks) });
                    callback!(undefined, { secure_url: url, public_id: options!.public_id, width: 1, height: 1 } as UploadApiResponse);
                    done();
                },
            }) as UploadStream;
        },
    }, () => config);
    return { service, calls };
}

test('Cloudinary accepts separate credentials or the API environment URL without mixing environments', () => {
    assert.deepEqual(getCloudinaryConfig({ CLOUDINARY_CLOUD_NAME: ' test-cloud ', CLOUDINARY_API_KEY: '123456', CLOUDINARY_API_SECRET: 'test-secret' }), config);
    assert.deepEqual(getCloudinaryConfig({ CLOUDINARY_URL: 'cloudinary://123456:test-secret@test-cloud' }), config);
    assert.equal(getCloudinaryConfig({ CLOUDINARY_URL: 'cloudinary://123456:encoded%2Bsecret@test-cloud' }).api_secret, 'encoded+secret');
    for (const env of [{}, { CLOUDINARY_CLOUD_NAME: 'partial', CLOUDINARY_URL: 'cloudinary://123:secret@other-cloud' }, { CLOUDINARY_URL: 'https://123:secret@other-cloud' }]) {
        assert.throws(() => getCloudinaryConfig(env), (error: unknown) => error instanceof ImageUploadError && error.status === 503 && !error.message.includes('secret@'));
    }
});

test('signed upload preserves original bytes and returns only the persistent URL', async () => {
    const { service, calls } = captureUpload();
    assert.deepEqual(await service.upload(png, 'image/png'), { url });
    assert.deepEqual(calls[0].bytes, png);
    assert.equal(calls[0].options.api_secret, config.api_secret);
    assert.equal(calls[0].options.overwrite, false);
    assert.equal(calls[0].options.transformation, undefined);
    assert.equal(calls[0].options.eager, undefined);
    await service.upload(png, 'image/png');
    assert.notEqual(calls[0].options.public_id, calls[1].options.public_id);
    await service.upload(png, 'image/png', 'legacy-source');
    await service.upload(png, 'image/png', 'legacy-source');
    assert.equal(calls[2].options.public_id, calls[3].options.public_id);
});

test('invalid types, forged signatures, empty and oversized files never reach Cloudinary', async () => {
    const { service, calls } = captureUpload();
    for (const [body, type, status] of [
        [png, 'image/svg+xml', 400], [Buffer.alloc(0), 'image/png', 400],
        [Buffer.from('<html>'), 'image/png', 400], [png, 'image/jpeg', 400],
        [Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image/png', 413], ['url', 'image/png', 400],
    ] as const) {
        await assert.rejects(service.upload(body, type), (error: unknown) => error instanceof ImageUploadError && error.status === status);
    }
    assert.equal(calls.length, 0);
});

test('provider and stream failures do not expose credentials', async () => {
    for (const failure of ['callback', 'stream']) {
        const service = new ImageStorageService({ upload_stream(_options, callback) {
            return new Writable({ write(_chunk, _encoding, done) {
                const error = new Error('Sensitive URL: cloudinary://123:private-secret@test-cloud');
                if (failure === 'callback') { callback!(error as never); done(); }
                else done(error);
            } }) as UploadStream;
        } }, () => config);
        await assert.rejects(service.upload(png, 'image/png'), (error: unknown) => error instanceof ImageUploadError && error.status === 502 && !error.message.includes('private-secret'));
    }
});

test('HTTP uploads require authentication, keep the size limit and return the Cloudinary URL', async context => {
    const previous = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = 'image-test-only-secret';
    context.after(() => { if (previous === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = previous; });
    app.locals.rateLimitStore = new MemoryTokenBucketStore();
    app.locals.rateLimitPolicies = readPolicies({});
    const upload = context.mock.method(ImageStorageService.prototype, 'upload', async () => ({ url }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    context.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const token = jwt.sign({ adminId: 'test-admin', role: 'ADMIN' }, process.env.JWT_ACCESS_SECRET!);
    const headers = { 'Content-Type': 'image/png', Authorization: `Bearer ${token}` };
    assert.equal((await fetch(`${origin}/event/image/upload`, { method: 'POST', body: png })).status, 401);
    assert.equal(upload.mock.callCount(), 0);
    const response = await fetch(`${origin}/event/image/upload`, { method: 'POST', headers, body: png });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { url });
    assert.deepEqual(upload.mock.calls[0].arguments, [png, 'image/png']);
    const oversized = await fetch(`${origin}/event/image/upload`, { method: 'POST', headers, body: Buffer.alloc(MAX_IMAGE_BYTES + 1) });
    assert.equal(oversized.status, 413);
    assert.equal(upload.mock.callCount(), 1);

    // Existing private photos still require a database reference before reads.
    const referenced = context.mock.method(EventImageService.prototype, 'isImageReferenced', async () => false);
    context.mock.method(LegacyBlobStorageService.prototype, 'urlForPathname', () => 'https://store.private.blob.vercel-storage.com/event-images/photo.png');
    const read = context.mock.method(LegacyBlobStorageService.prototype, 'read', async () => ({ statusCode: 304, blob: { etag: 'test-etag' } }) as any);
    const path = '/event/image/file?pathname=event-images/12345678-1234-1234-1234-123456789abc.png';
    assert.equal((await fetch(origin + path)).status, 404);
    assert.equal(read.mock.callCount(), 0);
    referenced.mock.mockImplementation(async () => true);
    const cached = await fetch(origin + path, { headers: { 'If-None-Match': 'test-etag' } });
    assert.equal(cached.status, 304);
    assert.equal(cached.headers.get('etag'), 'test-etag');
    assert.equal(await cached.text(), '');
    assert.equal(read.mock.calls[0].arguments[1], 'test-etag');
    assert.equal((await fetch(origin + '/event/image/file?pathname=other-file')).status, 400);
});

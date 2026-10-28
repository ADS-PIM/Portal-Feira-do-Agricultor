import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { migrateEventImages, legacyImagePath } from '../src/service/imageMigration.service';
import { ImageStorageService } from '../src/service/imageStorage.service';
import { LegacyBlobStorageService } from '../src/service/legacyBlobStorage.service';
import { imageMigrationRepository } from '../src/scripts/migrateEventImages';
import { connection } from '../src/util/connection';

const pathname = 'event-images/12345678-1234-1234-1234-123456789abc.png';
const oldUrl = `https://store.private.blob.vercel-storage.com/${pathname}`;
const newUrl = 'https://res.cloudinary.com/test/image/upload/v123/event-images/migrated/test.png';

test('migration dry run never uploads, reads Blob or modifies SQL', async () => {
    const report = await migrateEventImages({ listUrls: async () => [oldUrl, oldUrl, newUrl, '/uploads/old.png'], replaceUrl: async () => { assert.fail('Unexpected write'); } });
    assert.deepEqual(report, { found: 1, migrated: 0, failed: 0, skipped: 2 });
    for (const value of ['https://evil.example/' + pathname, oldUrl + '?token=secret', oldUrl.replace(pathname, '../secret'), oldUrl.replace('https://', 'http://')]) assert.equal(legacyImagePath(value), null);
});

test('migration updates shared references only after upload; failures preserve the old URL and can be retried', async () => {
    let currentUrl = oldUrl;
    let shouldFail = true;
    const sources: string[] = [];
    const repository = {
        listUrls: async () => [currentUrl, currentUrl],
        replaceUrl: async (previous: string, next: string) => {
            assert.equal(previous, oldUrl);
            if (shouldFail) throw new Error('SQL failed');
            currentUrl = next;
        },
    };
    const options = {
        apply: true,
        legacy: {
            urlForPathname: () => oldUrl,
            read: async () => ({ statusCode: 200, stream: Readable.toWeb(Readable.from([Buffer.from('image')])), blob: { contentType: 'image/png' } }),
        } as unknown as LegacyBlobStorageService,
        storage: { upload: async (_bytes: Buffer, type: string, source: string) => { assert.equal(type, 'image/png'); sources.push(source); return { url: newUrl }; } } as unknown as ImageStorageService,
    };
    assert.equal((await migrateEventImages(repository, options)).failed, 1);
    assert.equal(currentUrl, oldUrl);
    shouldFail = false;
    assert.equal((await migrateEventImages(repository, options)).migrated, 1);
    assert.equal(currentUrl, newUrl);
    assert.deepEqual(sources, [oldUrl, oldUrl]);
    assert.equal((await migrateEventImages(repository, options)).found, 0);
});

test('migration refuses a private image belonging to a different Blob store', async () => {
    const report = await migrateEventImages({ listUrls: async () => [oldUrl], replaceUrl: async () => { assert.fail('Unexpected write'); } }, {
        apply: true,
        legacy: { urlForPathname: () => oldUrl.replace('store.', 'different.'), read: async () => { assert.fail('Unexpected read'); } } as unknown as LegacyBlobStorageService,
    });
    assert.equal(report.failed, 1);
});

test('banner and gallery links commit together and roll back on a partial SQL failure', async context => {
    for (const fail of [false, true]) {
        const calls: string[] = [];
        const db = {
            beginTransaction: async () => { calls.push('begin'); },
            query: async (sql: string, values: string[]) => {
                assert.deepEqual(values, [newUrl, oldUrl]);
                calls.push(sql.includes('UPDATE events') ? 'events' : 'images');
                if (fail && sql.includes('UPDATE images')) throw new Error('SQL failed');
            },
            commit: async () => { calls.push('commit'); }, rollback: async () => { calls.push('rollback'); }, release: () => { calls.push('release'); },
        };
        const mocked = context.mock.method(connection, 'getConnection', async () => db as any);
        if (fail) await assert.rejects(imageMigrationRepository.replaceUrl(oldUrl, newUrl));
        else await imageMigrationRepository.replaceUrl(oldUrl, newUrl);
        assert.deepEqual(calls, ['begin', 'events', 'images', fail ? 'rollback' : 'commit', 'release']);
        mocked.mock.restore();
    }
});

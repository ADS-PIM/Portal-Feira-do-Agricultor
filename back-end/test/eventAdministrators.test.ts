import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { EventDAO } from '../src/dao/event.dao';
import { MemoryTokenBucketStore } from '../src/rateLimit/tokenBucket';
import { readPolicies } from '../src/rateLimit/middleware';

test('administrative event authors require authentication and are visible to both admin roles', async context => {
    const previousSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = 'event-authors-test-only-secret';
    context.after(() => {
        if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = previousSecret;
    });
    const event = {
        id: 'event-self', title: 'Feira', date: '2026-11-07', description: null,
        startAt: '06:00:00', endAt: '12:00:00', localAddress: 'Praça', state: 'PENDING',
        bannerImage: null, createdAt: '2026-10-24 10:00:00',
    };
    const authoredEvents = [
        { ...event, administratorId: 'self', administratorName: 'Ana', administratorActive: true },
        { ...event, id: 'event-other', administratorId: 'other', administratorName: 'Bruno', administratorActive: false },
    ];
    const administrative = context.mock.method(EventDAO.prototype, 'searchForAdmin', async () => authoredEvents as any);
    const publicList = context.mock.method(EventDAO.prototype, 'searchAll', async () => [event] as any);
    const detail = context.mock.method(EventDAO.prototype, 'searchById', async () => { throw new Error('Wrong route'); });
    app.locals.rateLimitStore = new MemoryTokenBucketStore();
    app.locals.rateLimitPolicies = readPolicies({});
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
        assert.equal((await fetch(origin + '/event/admin')).status, 401);
        assert.equal(administrative.mock.callCount(), 0);
        for (const role of ['ADMIN', 'SUPER_ADMIN']) {
            const accessToken = jwt.sign({ adminId: 'self', role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '1m' });
            const response = await fetch(origin + '/event/admin', { headers: { Authorization: `Bearer ${accessToken}` } });
            assert.equal(response.status, 200);
            assert.deepEqual(await response.json(), authoredEvents);
        }
        assert.equal(detail.mock.callCount(), 0);
        const publicResponse = await fetch(origin + '/event');
        assert.equal(publicResponse.status, 200);
        assert.deepEqual(await publicResponse.json(), [event]);
        assert.equal(publicList.mock.callCount(), 1);
        assert.equal(administrative.mock.callCount(), 2);

        administrative.mock.mockImplementation(async () => []);
        const accessToken = jwt.sign({ adminId: 'self', role: 'ADMIN' }, process.env.JWT_ACCESS_SECRET!);
        const empty = await fetch(origin + '/event/admin', { headers: { Authorization: `Bearer ${accessToken}` } });
        assert.deepEqual(await empty.json(), []);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

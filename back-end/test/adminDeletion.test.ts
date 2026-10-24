import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { AdminController } from '../src/controller/admin.controller';
import { AdminDAO } from '../src/dao/admin.dao';
import { MemoryTokenBucketStore } from '../src/rateLimit/tokenBucket';
import { readPolicies } from '../src/rateLimit/middleware';
import { AdminService } from '../src/service/admin.service';

const blockedResults = [
    { result: 'not_found', status: 404, code: 'ADMIN_NOT_FOUND' },
    { result: 'super_admin', status: 403, code: 'SUPER_ADMIN_DELETE_FORBIDDEN' },
    { result: 'has_events', status: 409, code: 'ADMIN_HAS_EVENTS' },
] as const;

function response() {
    const state = { status: 0, body: {} as Record<string, string> };
    const res = {
        status(code: number) { state.status = code; return this; },
        json(body: typeof state.body) { state.body = body; return this; },
    } as unknown as Response;
    return { state, res };
}

test('admin deletion reports expected business failures without treating them as an outage', async context => {
    const dao = new AdminDAO();
    const service = new AdminService(dao);
    for (const { result, status, code } of blockedResults) {
        const deletion = context.mock.method(dao, 'delete', async () => result);
        await assert.rejects(service.delete('target-admin'), (error: any) => {
            assert.equal(error.status, status);
            assert.equal(error.code, code);
            return true;
        });
        assert.deepEqual(deletion.mock.calls[0].arguments, ['target-admin']);
        deletion.mock.restore();
    }
    const deletion = context.mock.method(dao, 'delete', async () => 'deleted' as const);
    assert.equal(await service.delete('target-admin'), undefined);
    assert.equal(deletion.mock.callCount(), 1);
});

test('admin deletion controller returns 404/403/409 codes and successful deletion returns 200', async context => {
    const dao = new AdminDAO();
    const controller = new AdminController(new AdminService(dao));
    for (const { result, status, code } of blockedResults) {
        const deletion = context.mock.method(dao, 'delete', async () => result);
        const { state, res } = response();
        await controller.delete({ params: { id: 'target-admin' } } as unknown as Request, res);
        assert.equal(state.status, status);
        assert.equal(state.body.code, code);
        assert.equal(typeof state.body.error, 'string');
        deletion.mock.restore();
    }
    context.mock.method(dao, 'delete', async () => 'deleted' as const);
    const { state, res } = response();
    await controller.delete({ params: { id: 'target-admin' } } as unknown as Request, res);
    assert.equal(state.status, 200);
    assert.equal(typeof state.body.message, 'string');
});

test('admin deletion controller rejects malformed ids and keeps unexpected failures as server errors', async context => {
    context.mock.method(console, 'error', () => {});
    const dao = new AdminDAO();
    const deletion = context.mock.method(dao, 'delete', async () => { throw new Error('database unavailable'); });
    const controller = new AdminController(new AdminService(dao));
    const malformed = response();
    await controller.delete({ params: { id: ['one', 'two'] } } as unknown as Request, malformed.res);
    assert.equal(malformed.state.status, 400);
    assert.equal(deletion.mock.callCount(), 0);

    const failed = response();
    await controller.delete({ params: { id: 'target-admin' } } as unknown as Request, failed.res);
    assert.equal(failed.state.status, 500);
    assert.equal(typeof failed.state.body.error, 'string');
});

test('DELETE /admin/:id requires SUPER_ADMIN and preserves business status codes through the real route', async context => {
    const previousAccessSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = 'admin-deletion-test-only-secret';
    context.after(() => {
        if (previousAccessSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = previousAccessSecret;
    });
    let outcome: 'deleted' | 'not_found' | 'super_admin' | 'has_events' = 'deleted';
    const deletion = context.mock.method(AdminDAO.prototype, 'delete', async () => outcome);
    app.locals.rateLimitStore = new MemoryTokenBucketStore();
    app.locals.rateLimitPolicies = readPolicies({});
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const token = (role: string) => jwt.sign({ adminId: 'acting-admin', role }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '1m' });
    const request = (accessToken?: string) => fetch(origin + '/admin/target-admin', {
        method: 'DELETE', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    try {
        assert.equal((await request()).status, 401);
        assert.equal((await request(token('ADMIN'))).status, 403);
        assert.equal(deletion.mock.callCount(), 0);

        assert.equal((await request(token('SUPER_ADMIN'))).status, 200);
        assert.equal(deletion.mock.callCount(), 1);
        assert.deepEqual(deletion.mock.calls[0].arguments, ['target-admin']);
        for (const { result, status, code } of blockedResults) {
            outcome = result;
            const resultResponse = await request(token('SUPER_ADMIN'));
            assert.equal(resultResponse.status, status);
            assert.equal((await resultResponse.json()).code, code);
        }
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { AdminDAO } from '../src/dao/admin.dao';
import { RefreshTokenDAO } from '../src/dao/refreshToken.dao';
import { AdminRole } from '../src/model/admin';
import { PasswordCrypto } from '../src/service/passwordCrypto';
import { MemoryTokenBucketStore } from '../src/rateLimit/tokenBucket';
import { readPolicies } from '../src/rateLimit/middleware';

test('login and restored sessions explain disabled accounts without issuing tokens or revealing them on wrong passwords', async context => {
    const previousAccess = process.env.JWT_ACCESS_SECRET;
    const previousRefresh = process.env.JWT_REFRESH_SECRET;
    process.env.JWT_ACCESS_SECRET = 'session-test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'session-test-refresh-secret';
    context.after(() => {
        if (previousAccess === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = previousAccess;
        if (previousRefresh === undefined) delete process.env.JWT_REFRESH_SECRET;
        else process.env.JWT_REFRESH_SECRET = previousRefresh;
    });
    const admin = { id: 'test-admin', name: 'Test', email: 'admin@example.com', password: 'test-hash',
        role: AdminRole.ADMIN, active: false, createdAt: new Date(), profile_picture: null };
    context.mock.method(AdminDAO.prototype, 'searchByEmail', async () => admin);
    const byId = context.mock.method(AdminDAO.prototype, 'searchById', async () => admin);
    context.mock.method(PasswordCrypto, 'verifyPassword', async (password: string) => password === 'correct-password');
    const create = context.mock.method(RefreshTokenDAO.prototype, 'create', async () => {});
    context.mock.method(RefreshTokenDAO.prototype, 'findByToken', async () => ({ id: 'old-token-id' }));
    context.mock.method(RefreshTokenDAO.prototype, 'deleteByToken', async () => {});
    const revoke = context.mock.method(RefreshTokenDAO.prototype, 'deleteByUserId', async () => {});
    const rotate = context.mock.method(RefreshTokenDAO.prototype, 'rotate', async () => true);
    app.locals.rateLimitStore = new MemoryTokenBucketStore();
    app.locals.rateLimitPolicies = readPolicies({});
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const login = (password: string) => fetch(origin + '/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin.email, password }),
    });
    const refresh = (token: string) => fetch(origin + '/admin/refresh', {
        method: 'POST', headers: { Cookie: `refreshToken=${token}` },
    });
    try {
        const wrong = await login('wrong-password');
        assert.equal(wrong.status, 401);
        assert.equal((await wrong.json()).code, undefined);

        const disabled = await login('correct-password');
        assert.equal(disabled.status, 403);
        assert.equal((await disabled.json()).code, 'ADMIN_DISABLED');
        assert.match(disabled.headers.get('set-cookie')!, /refreshToken=;/);
        assert.equal(create.mock.callCount(), 0);

        const invalidRefresh = await refresh('invalid-token');
        assert.equal(invalidRefresh.status, 401);
        assert.equal(byId.mock.callCount(), 0);
        const oldToken = jwt.sign({ adminId: admin.id, role: 'SUPER_ADMIN' }, process.env.JWT_REFRESH_SECRET!,
            { expiresIn: '1m', jwtid: 'old-token-id' });
        const disabledRefresh = await refresh(oldToken);
        assert.equal(disabledRefresh.status, 403);
        assert.equal((await disabledRefresh.json()).code, 'ADMIN_DISABLED');
        assert.match(disabledRefresh.headers.get('set-cookie')!, /refreshToken=;/);
        assert.deepEqual(revoke.mock.calls[0].arguments, [admin.id]);
        assert.equal(rotate.mock.callCount(), 0);

        admin.active = true;
        const activeLogin = await login('correct-password');
        assert.equal(activeLogin.status, 200);
        const loginBody = await activeLogin.json();
        assert.equal(loginBody.userId, admin.id);
        assert.ok(loginBody.accessToken);
        assert.equal(create.mock.callCount(), 1);
        const activeRefresh = await refresh(oldToken);
        assert.equal(activeRefresh.status, 200);
        const refreshBody = await activeRefresh.json();
        const payload = jwt.verify(refreshBody.accessToken, process.env.JWT_ACCESS_SECRET!) as jwt.JwtPayload;
        assert.equal(payload.role, 'ADMIN');
        assert.equal(rotate.mock.callCount(), 1);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

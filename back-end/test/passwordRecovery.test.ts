import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Request, Response } from 'express';
import { PasswordResetController, recoveryMessage } from '../src/controller/passwordReset.controller';
import { PasswordResetService, hashResetToken } from '../src/service/passwordReset.service';
import { passwordResetEmail, readRecoveryEmailConfig, sendPasswordResetEmail } from '../src/service/passwordResetEmail';
import { PasswordCrypto } from '../src/service/passwordCrypto';
import { MemoryTokenBucketStore } from '../src/rateLimit/tokenBucket';
import { readPolicies } from '../src/rateLimit/middleware';
import app from '../src/app';
import { AdminController } from '../src/controller/admin.controller';

const config = { apiKey: 'test-only-key', from: 'Test <onboarding@resend.dev>', frontendUrl: 'https://portal.example/' };

test('Root bootstrap route stays disabled and ordinary admin creation still requires authentication', async context => {
    const register = context.mock.method(AdminController.prototype, 'register', async (_req, res) => res.status(201).json({}));
    app.locals.rateLimitStore = new MemoryTokenBucketStore();
    app.locals.rateLimitPolicies = readPolicies({});
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'test@example.com', password: 'TestPassword123', role: 'SUPER_ADMIN' }) };
    try {
        for (const path of ['/admin/register/force', '/admin/register/force/', '/ADMIN/REGISTER/FORCE']) {
            assert.equal((await fetch(origin + path, options)).status, 404);
        }
        assert.equal((await fetch(origin + '/admin/register', options)).status, 401);
        assert.equal(register.mock.callCount(), 0);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

function fixture() {
    const issued: { email: string; hash: string }[] = [];
    const discarded: string[] = [];
    const sent: { email: string; link: string }[] = [];
    const dao = {
        async issue(email: string, hash: string) { issued.push({ email, hash }); return email === 'admin@example.com' ? { email } : null; },
        async discard(hash: string) { discarded.push(hash); },
        async consume(_hash: string, _password: string) { return true; },
    };
    const send = async (_config: typeof config, email: string, link: string) => { sent.push({ email, link }); };
    return { dao, issued, discarded, sent, service: new PasswordResetService(dao, send, () => config) };
}

function response() {
    const state = { status: 0, body: {} as Record<string, string>, headers: {} as Record<string, string>, cleared: false };
    const res = {
        status(code: number) { state.status = code; return this; },
        json(body: typeof state.body) { state.body = body; return this; },
        setHeader(name: string, value: string) { state.headers[name] = value; },
        clearCookie() { state.cleared = true; },
    } as unknown as Response;
    return { state, res };
}

test('requests send a random link to the stored email and persist only the SHA-256 token hash', async () => {
    const f = fixture();
    await f.service.request(' Admin@Example.com ');
    await f.service.request('admin@example.com');
    const tokens = f.sent.map(item => new URLSearchParams(new URL(item.link).hash.split('?')[1]).get('token')!);
    assert.notEqual(tokens[0], tokens[1]);
    for (let i = 0; i < tokens.length; i++) {
        assert.match(tokens[i], /^[a-f0-9]{64}$/);
        assert.equal(f.issued[i].hash, hashResetToken(tokens[i]));
        assert.notEqual(f.issued[i].hash, tokens[i]);
        assert.equal(f.sent[i].email, 'admin@example.com');
        assert.equal(new URL(f.sent[i].link).origin, 'https://portal.example');
        assert.match(new URL(f.sent[i].link).hash, /^#\/admin\/redefinir-senha\?token=/);
    }
});

test('known and unknown emails receive the same status, body and no-store header', async () => {
    const f = fixture();
    const controller = new PasswordResetController(f.service);
    for (const email of ['admin@example.com', 'unknown@example.com']) {
        const { state, res } = response();
        await controller.request({ body: { email } } as Request, res);
        assert.equal(state.status, 202);
        assert.deepEqual(state.body, { message: recoveryMessage });
        assert.equal(state.headers['Cache-Control'], 'no-store');
    }
    assert.equal(f.sent.length, 1);
});

test('delivery failure discards only that token and does not disclose account existence', async context => {
    context.mock.method(console, 'error', () => {});
    const f = fixture();
    const service = new PasswordResetService(f.dao, async () => { throw new Error('provider failure'); }, () => config);
    const { state, res } = response();
    await new PasswordResetController(service).request({ body: { email: 'admin@example.com' } } as Request, res);
    assert.equal(state.status, 202);
    assert.deepEqual(f.discarded, [f.issued[0].hash]);
});

test('missing config fails before account lookup; reset works without email provider config', async context => {
    const f = fixture();
    const issue = context.mock.method(f.dao, 'issue');
    const service = new PasswordResetService(f.dao, async () => {}, () => { throw new Error('not configured'); });
    await assert.rejects(service.request('admin@example.com'));
    assert.equal(issue.mock.callCount(), 0);
    const consume = context.mock.method(f.dao, 'consume', async (hash, password) => {
        assert.equal(hash, hashResetToken('a'.repeat(64)));
        assert.notEqual(password, 'NovaSenha123');
        assert.ok(await PasswordCrypto.verifyPassword('NovaSenha123', password));
        return true;
    });
    assert.equal(await service.reset('a'.repeat(64), 'NovaSenha123'), true);
    assert.equal(consume.mock.callCount(), 1);
});

test('invalid emails, malformed tokens, short/blank passwords and bcrypt overflow are rejected before service execution', async context => {
    const f = fixture();
    const controller = new PasswordResetController(f.service);
    const request = context.mock.method(f.service, 'request');
    const reset = context.mock.method(f.service, 'reset');
    for (const email of [null, [], {}, 'invalid', 'x'.repeat(321)]) {
        const { state, res } = response();
        await controller.request({ body: { email } } as Request, res);
        assert.equal(state.status, 400);
    }
    for (const body of [null, {}, { token: ['a'.repeat(64)] }, { token: 'a'.repeat(64), password: 'short' },
        { token: 'a'.repeat(64), password: ' '.repeat(8) }, { token: 'a'.repeat(64), password: 'á'.repeat(37) },
        { token: 'a'.repeat(64), password: 'x'.repeat(73) }]) {
        const { state, res } = response();
        await controller.reset({ body } as Request, res);
        assert.equal(state.status, 400);
    }
    assert.equal(request.mock.callCount(), 0);
    assert.equal(reset.mock.callCount(), 0);
});

test('reset handles expired/used links, success with cookie removal, and database errors', async context => {
    context.mock.method(console, 'error', () => {});
    const f = fixture();
    const controller = new PasswordResetController(f.service);
    for (const result of ['invalid', 'ok', 'failure']) {
        const mock = context.mock.method(f.service, 'reset', async () => { if (result === 'failure') throw new Error(); return result === 'ok'; });
        const { state, res } = response();
        await controller.reset({ body: { token: 'a'.repeat(64), password: 'NovaSenha123' } } as Request, res);
        assert.equal(state.status, result === 'ok' ? 200 : result === 'invalid' ? 400 : 503);
        assert.equal(state.cleared, result === 'ok');
        if (result === 'invalid') assert.equal(state.body.code, 'INVALID_RESET_TOKEN');
        mock.mock.restore();
    }
});

test('Resend request includes HTML/text and server-only authorization; provider errors are sanitized', async context => {
    const link = 'https://portal.example/#/admin/redefinir-senha?token=' + 'a'.repeat(64);
    const send = context.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, 'https://api.resend.com/emails');
        assert.equal(options?.method, 'POST');
        assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-only-key');
        const body = JSON.parse(options?.body as string);
        assert.deepEqual(body.to, ['admin@example.com']);
        assert.match(body.html, /Redefinir minha senha/);
        assert.ok(body.text.includes(link));
        return new Response('{"id":"test"}', { status: 200 });
    });
    await sendPasswordResetEmail(config, 'admin@example.com', link);
    send.mock.restore();
    context.mock.method(globalThis, 'fetch', async () => new Response('private provider error', { status: 403 }));
    await assert.rejects(sendPasswordResetEmail(config, 'admin@example.com', link), { message: 'RESEND_SEND_FAILED_403' });
    assert.ok(passwordResetEmail('https://example.com/?a="<test>"').html.includes('&quot;&lt;test&gt;&quot;'));
});

test('recovery URL config accepts HTTPS/local development and rejects credentials, query/hash and insecure public URLs', () => {
    for (const url of ['https://site.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173']) {
        assert.ok(readRecoveryEmailConfig({ RESEND_API_KEY: 'test', PASSWORD_RESET_FRONTEND_URL: url }).frontendUrl);
    }
    for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:password@example.com', 'https://example.com/#x', 'https://example.com/?q=1', '']) {
        assert.throws(() => readRecoveryEmailConfig({ RESEND_API_KEY: 'test', PASSWORD_RESET_FRONTEND_URL: url }));
    }
    assert.throws(() => readRecoveryEmailConfig({ PASSWORD_RESET_FRONTEND_URL: 'https://example.com' }));
});

test('public recovery routes have separate IP/email limits and reset cannot bypass its IP limit', async context => {
    const request = context.mock.method(PasswordResetController.prototype, 'request', async (_req, res) => res.status(202).json({ message: recoveryMessage }));
    const reset = context.mock.method(PasswordResetController.prototype, 'reset', async (_req, res) => res.status(400).json({ code: 'INVALID_RESET_TOKEN' }));
    app.set('trust proxy', 'loopback');
    app.locals.rateLimitPolicies = readPolicies({ RATE_LIMIT_PASSWORD_RECOVERY_CAPACITY: '2' });
    app.locals.rateLimitStore = new MemoryTokenBucketStore(() => 0);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = async (route: string, email: string, ip: string) => fetch(`${origin}/admin/${route}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify({ email }),
    });
    try {
        assert.equal((await post('forgot-password', ' Admin@example.com ', '192.0.2.1')).status, 202);
        assert.equal((await post('forgot-password', 'admin@example.com', '192.0.2.2')).status, 202);
        assert.equal((await post('forgot-password', 'admin@example.com', '192.0.2.3')).status, 429);
        assert.equal((await post('forgot-password', 'other@example.com', '192.0.2.1')).status, 202);
        assert.equal((await post('forgot-password', 'another@example.com', '192.0.2.1')).status, 429);
        assert.equal((await post('reset-password', '', '192.0.2.1')).status, 400);
        assert.equal((await post('reset-password', '', '192.0.2.1')).status, 400);
        const limited = await post('RESET-PASSWORD/', '', '192.0.2.1');
        assert.equal(limited.status, 429);
        assert.ok(limited.headers.get('Retry-After'));
        assert.equal(request.mock.callCount(), 3);
        assert.equal(reset.mock.callCount(), 2);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

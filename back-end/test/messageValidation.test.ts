import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import app from '../src/app';
import { MessageDAO } from '../src/dao/message.dao';
import { MemoryTokenBucketStore } from '../src/rateLimit/tokenBucket';
import { readPolicies } from '../src/rateLimit/middleware';
import { getContactEmailError, getContactPhoneError } from '../../front-end/src/utils/contactValidation';

test('message submission rejects invalid contacts before persistence, including direct API requests', async context => {
    const persistence = context.mock.method(MessageDAO.prototype, 'create', async () => {});
    app.locals.rateLimitPolicies = readPolicies({});
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const payload = {
        name: 'Ana Silva', email: 'ana@example.com', phone: '(88) 99999-9999',
        subject: 'DOUBT', title: 'Contato', message: 'Gostaria de saber mais sobre a feira.',
    };
    const request = (overrides: Record<string, unknown>) => {
        // Validation scenarios must not exhaust the unrelated submission rate limit.
        app.locals.rateLimitStore = new MemoryTokenBucketStore();
        return fetch(origin + '/message/create', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, ...overrides }),
        });
    };
    try {
        for (const email of ['', 'ana', 'ana@gmail', 'ana@@gmail.com', 'ana @gmail.com', '.ana@gmail.com', 'ana..silva@gmail.com', 'ana@-gmail.com', 'ana@gmail..com', 'a'.repeat(65) + '@example.com', 123, ['ana@example.com']]) {
            if (typeof email === 'string') {
                assert.ok(getContactEmailError(email), `Frontend must reject email: ${email}`);
            }
            const response = await request({ email });
            assert.equal(response.status, 400, `email: ${JSON.stringify(email)}`);
            const body = await response.json() as { errors: { property: string }[] };
            assert.ok(body.errors.some(error => error.property === 'email'));
            assert.equal(persistence.mock.callCount(), 0);
        }

        for (const phone of ['efffsdf', '99999-9999', '8899999999', '(08) 99999-9999', '(88 99999-9999', '(88) 9999-9999', '(88) 99999-99999', '(88) 3333-4444abc', '+1 88 99999-9999', 88999999999, ['(88) 99999-9999']]) {
            if (typeof phone === 'string') {
                assert.ok(getContactPhoneError(phone), `Frontend must reject phone: ${phone}`);
            }
            const response = await request({ phone });
            assert.equal(response.status, 400, `phone: ${JSON.stringify(phone)}`);
            const body = await response.json() as { errors: { property: string }[] };
            assert.ok(body.errors.some(error => error.property === 'phone'));
            assert.equal(persistence.mock.callCount(), 0);
        }

        for (const email of ['ffffsf@gmail.com', 'ana.silva+feira@example.com.br', "o'connor@example.com", ' ana@example.com ']) {
            assert.equal(getContactEmailError(email), '');
            assert.equal((await request({ email })).status, 201);
            assert.equal(persistence.mock.calls.at(-1)!.arguments[0].email, email.trim());
        }
        for (const phone of [undefined, null, '', '   ', '88999999999', '(88) 99999-9999', '8833334444', '(88) 3333-4444', '+5588999999999', '+55 (88) 99999-9999', ' (88) 3333-4444 ']) {
            if (typeof phone === 'string') assert.equal(getContactPhoneError(phone), '');
            assert.equal((await request({ phone })).status, 201, String(phone));
            assert.equal(persistence.mock.calls.at(-1)!.arguments[0].phone, phone?.trim() || '');
        }
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

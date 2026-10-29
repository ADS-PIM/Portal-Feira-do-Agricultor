import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('disabled login, refresh and cached profiles clear authentication and report the account status', async context => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
    context.after(() => server.close())
    const { apiFetch, restoreAdminProfile } = await server.ssrLoadModule('/src/services/api.ts')
    const auth = await server.ssrLoadModule('/src/services/authToken.ts')
    const { isAdminDisabledError } = await server.ssrLoadModule('/src/services/errors.ts')
    const profile = { id: 'inactive-admin', name: 'Ana', email: 'ana@example.com', role: 'ADMIN', active: false, profile_picture: null }
    const seed = () => {
        auth.setAccessToken('old-access-token')
        auth.setAdminProfile(profile)
    }
    let mode = 'disabled'
    const requests = []
    context.mock.method(globalThis, 'fetch', async (input, options) => {
        requests.push({ input, method: options?.method })
        if (input.endsWith('/admin/logout')) return Response.json({ message: 'ok' })
        if (mode === 'profile') return Response.json(profile)
        if (mode === 'active') return Response.json({ ...profile, active: true })
        if (mode === 'expired') return Response.json({}, { status: 401 })
        return Response.json({ code: 'ADMIN_DISABLED' }, { status: 403 })
    })
    const disabledError = error => {
        assert.ok(isAdminDisabledError(error))
        assert.equal(error.message, 'O acesso desta conta administrativa foi desativado.')
        assert.equal(auth.getAccessToken(), null)
        assert.equal(auth.getAdminProfile(), null)
        return true
    }
    seed()
    await assert.rejects(apiFetch('admin/login', { method: 'POST' }), disabledError)
    assert.equal(auth.getAdminId(), null)
    await assert.rejects(restoreAdminProfile(), disabledError)
    mode = 'profile'
    seed()
    await assert.rejects(restoreAdminProfile(), disabledError)
    assert.deepEqual(requests.at(-1), { input: '/admin/logout', method: 'POST' })
    mode = 'expired'
    assert.equal(await restoreAdminProfile(), null)
    mode = 'active'
    seed()
    assert.deepEqual(await restoreAdminProfile(), { ...profile, active: true })
    assert.equal(auth.getAdminProfile().active, true)
})

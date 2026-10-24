import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'

test('admin API errors explain deletion restrictions without exposing server details', async context => {
    const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
    context.after(() => server.close())
    const { apiFetch } = await server.ssrLoadModule('/src/services/api.ts')
    let response
    const fetchMock = context.mock.method(globalThis, 'fetch', async () => response)

    const cases = [
        [404, 'ADMIN_NOT_FOUND', 'Administrador não encontrado. Atualize a lista e tente novamente.'],
        [403, 'SUPER_ADMIN_DELETE_FORBIDDEN', 'Não é possível excluir o administrador principal.'],
        [409, 'ADMIN_HAS_EVENTS', 'Este administrador possui eventos vinculados. Desative o acesso para manter o histórico.'],
        [403, 'UNKNOWN', 'Você não tem autorização para realizar esta ação.'],
        [500, 'UNKNOWN', 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'],
    ]
    for (const [status, code, message] of cases) {
        response = Response.json({ code, error: 'private database detail', message: 'private server detail' }, { status })
        await assert.rejects(apiFetch('admin/test-admin', { method: 'DELETE' }), error => {
            assert.equal(error.name, 'ApiRequestError')
            assert.equal(error.status, status)
            assert.equal(error.code, code)
            assert.equal(error.message, message)
            return true
        })
    }
    assert.equal(fetchMock.mock.calls[0].arguments[0], '/admin/test-admin')
    assert.equal(fetchMock.mock.calls[0].arguments[1].method, 'DELETE')

    response = new Response('<html>proxy error</html>', { status: 502 })
    await assert.rejects(apiFetch('admin/test-admin', { method: 'DELETE' }), {
        name: 'ApiRequestError', status: 502,
        message: 'O serviço está temporariamente indisponível. Tente novamente mais tarde.',
    })

    response = Response.json({ error: 'private detail' }, { status: 409 })
    await assert.rejects(apiFetch('admin/test-admin', { method: 'PATCH' }), {
        name: 'ApiRequestError', status: 409, message: 'Este e-mail já está cadastrado em outra conta.',
    })

    response = Response.json({ code: 'INVALID_RESET_TOKEN' }, { status: 400 })
    await assert.rejects(apiFetch('admin/reset-password', { method: 'POST' }), {
        name: 'ApiRequestError', status: 400,
        message: 'Este link é inválido ou expirou. Solicite um novo link para redefinir sua senha.',
    })

    response = Response.json({ message: 'Admin deleted successfully' })
    assert.deepEqual(await apiFetch('admin/test-admin', { method: 'DELETE' }), { message: 'Admin deleted successfully' })
})

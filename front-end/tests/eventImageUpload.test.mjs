import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('create/edit show 10 MB for covers and gallery and enforce the exact boundary', async context => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
    context.after(() => server.close())
    const { validateEventImage, EVENT_IMAGE_MAX_BYTES } = await server.ssrLoadModule('/src/utils/eventImageUpload.ts')
    assert.equal(EVENT_IMAGE_MAX_BYTES, 10 * 1024 * 1024)
    for (const type of ['image/jpeg', 'image/png']) {
        assert.equal(validateEventImage({ type, size: EVENT_IMAGE_MAX_BYTES }), null)
        assert.match(validateEventImage({ type, size: EVENT_IMAGE_MAX_BYTES + 1 }), /10 MB/)
    }
    assert.match(validateEventImage({ type: 'image/png', size: 0 }), /vazio/)
    assert.match(validateEventImage({ type: 'image/svg+xml', size: 1 }), /JPG ou PNG/)
    const { default: AdminEventForm } = await server.ssrLoadModule('/src/pages/adminArea/AdminEventForm.tsx')
    for (const eventId of [null, 'editing-event']) {
        const markup = renderToStaticMarkup(createElement(AdminEventForm, {
            eventId, initialValues: { title: 'Feira', description: '', date: '2026-11-07', startAt: '08:00', endAt: '12:00', localAddress: 'Praça', state: 'PENDING', bannerImage: null },
            isSaving: false, error: null, onClose() {}, async onSubmit() {},
        }))
        assert.match(markup, /JPG ou PNG · até 10 MB/)
        assert.match(markup, /até 10 MB por imagem/)
        assert.doesNotMatch(markup, /4 MB/)
    }
})

test('10 MB upload bypasses the backend body limit and retries confirmation without resending the photo', async context => {
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
    context.after(() => server.close())
    const { uploadEventBanner } = await server.ssrLoadModule('/src/services/eventService.ts')
    const { setAccessToken } = await server.ssrLoadModule('/src/services/authToken.ts')
    setAccessToken('application-token')
    const calls = []
    let failConfirmation = true
    const url = 'https://res.cloudinary.com/test/image/upload/v1/event-images/photo.png'
    context.mock.method(globalThis, 'fetch', async (input, options) => {
        calls.push({ input, options })
        if (input === '/event/image/upload/authorize') {
            assert.equal(typeof options.body, 'string')
            assert.equal(JSON.parse(options.body).size, 10 * 1024 * 1024)
            return Response.json({ uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload', fields: { api_key: '123', signature: 'signed', public_id: 'event-images/photo' }, ticket: 'test-ticket', expiresAt: Date.now() + 3600000 })
        }
        if (input === 'https://api.cloudinary.com/v1_1/test/image/upload') {
            assert.equal(options.credentials, 'omit')
            assert.equal(options.headers, undefined)
            assert.ok(options.body instanceof FormData)
            assert.equal(options.body.get('file').size, 10 * 1024 * 1024)
            return Response.json({ secure_url: 'untrusted-client-response' })
        }
        assert.equal(input, '/event/image/upload/complete')
        assert.deepEqual(JSON.parse(options.body), { ticket: 'test-ticket' })
        return failConfirmation ? Response.json({}, { status: 502 }) : Response.json({ url })
    })
    const file = new File([new Uint8Array(10 * 1024 * 1024)], 'photo.png', { type: 'image/png' })
    await assert.rejects(uploadEventBanner(file))
    failConfirmation = false
    assert.deepEqual(await uploadEventBanner(file), { url })
    assert.deepEqual(await uploadEventBanner(file), { url })
    assert.equal(calls.length, 4)
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })
    await assert.rejects(uploadEventBanner(oversized), /10 MB/)
    assert.equal(calls.length, 4)
})

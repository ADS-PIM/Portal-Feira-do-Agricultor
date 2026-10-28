import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('Cloudinary images use responsive downscaling while originals and legacy URLs stay intact', async context => {
    const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
    context.after(() => server.close())
    const { getEventImageProps, getEventImageUrl } = await server.ssrLoadModule('/src/services/eventImageUrl.ts')
    const original = 'https://res.cloudinary.com/test-cloud/image/upload/v123/event-images/12345678-1234-1234-1234-123456789abc.png'
    const props = getEventImageProps(original, '(max-width: 640px) 100vw, 480px', 640)
    assert.match(props.src, /c_limit,w_640\/f_auto,q_auto:best\/v123/)
    assert.equal(props.sizes, '(max-width: 640px) 100vw, 480px')
    assert.equal(props.decoding, 'async')
    const candidates = props.srcSet.split(', ')
    assert.equal(candidates.length, 5)
    for (const width of [160, 320, 640, 1280, 2560]) {
        assert.ok(candidates.some(candidate => candidate.includes(`c_limit,w_${width}/`) && candidate.endsWith(` ${width}w`)))
    }
    assert.equal(getEventImageUrl(original), original)
    assert.match(getEventImageProps(original.replace('/event-images/', '/event-images/migrated/'), '100vw').src, /f_auto,q_auto:best/)

    const legacy = 'https://store.private.blob.vercel-storage.com/event-images/12345678-1234-1234-1234-123456789abc.png'
    assert.equal(getEventImageUrl(legacy, 'https://api.example'), 'https://api.example/event/image/file?pathname=event-images%2F12345678-1234-1234-1234-123456789abc.png')
    const legacyProps = getEventImageProps(legacy, '100vw')
    assert.match(legacyProps.src, /^\/event\/image\/file\?/)
    assert.equal(legacyProps.srcSet, undefined)
    for (const value of [
        'blob:http://localhost/preview', 'data:image/png;base64,preview', '/uploads/photo.png',
        'https://other.example/photo.png', original.replace('res.cloudinary.com', 'res.cloudinary.com.evil.example'),
        original.replace('/v123/', '/s--signature--/v123/'), original + '?signature=signed',
        original.replace('/v123/', '/w_200/v123/'),
    ]) {
        const untouched = getEventImageProps(value, '100vw')
        assert.equal(untouched.src, value)
        assert.equal(untouched.srcSet, undefined)
        assert.equal(untouched.sizes, undefined)
    }
    const { default: NearestEventPainel } = await server.ssrLoadModule('/src/components/Event/NearestEventPainel.tsx')
    const markup = renderToStaticMarkup(createElement(NearestEventPainel, { event: {
        id: 'test-event', title: 'Feira', bannerImage: original, description: null,
        date: '2026-10-28', startAt: '08:00:00', endAt: '12:00:00', localAddress: 'Praça',
    } }))
    assert.match(markup, /<img[^>]*srcSet="[^"]*2560w"/)
    assert.match(markup, /<img[^>]*sizes="[^"]+"/)
    assert.match(markup, /alt="Feira"/)
})

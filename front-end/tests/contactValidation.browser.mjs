import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Use the real form with simulated HTTP responses; no messages are persisted.
const fixture = `<html><head></head><body><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import ContactUs from '/src/pages/contactUs/ContactUs.tsx'; import '/src/index.css';
window.messages=[];
window.fetch=async(input,options={})=>{
 const path=new URL(input,location.origin).pathname;
 if(path.endsWith('/message/create'))window.messages.push(JSON.parse(options.body));
 return new Response(JSON.stringify({businessInfo:null,message:'ok'}),{
   status:path.endsWith('/admin/refresh')?401:path.endsWith('/message/create')?201:200,
   headers:{'Content-Type':'application/json'}
 });
};
createRoot(document.getElementById('root')).render(React.createElement(ContactUs));
</script></body></html>`

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'contact-validation-test', configureServer(server) {
        server.middlewares.use('/__contact-validation', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await server.transformIndexHtml('/__contact-validation', fixture))
        })
    },
}] })
await server.listen()
const profile = await mkdtemp(join(tmpdir(), 'contact-validation-'))
const browser = spawn(process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let socket
try {
    let port
    for (let i = 0; i < 80; i++) {
        try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break } catch { await pause(100) }
    }
    if (!port) throw new Error('Browser did not start')
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json())
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    let sequence = 0
    const pending = new Map()
    const errors = []
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data)
        if (message.id) {
            const promise = pending.get(message.id)
            if (promise) {
                clearTimeout(promise.timer); pending.delete(message.id)
                if (message.error) promise.reject(new Error(JSON.stringify(message.error)))
                else promise.resolve(message.result)
            }
        } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    }
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 30000)
        pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }))
    })
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
        return result.result.value
    }
    const until = async expression => {
        for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await pause(100) }
        throw new Error(`Condition failed: ${expression}`)
    }
    const fill = (name, value) => evaluate(`(()=>{
        const input=document.querySelector('.contact-form [name="${name}"]');
        const prototype=input instanceof HTMLSelectElement?HTMLSelectElement.prototype:input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,${JSON.stringify(value)});
        input.dispatchEvent(new Event(input instanceof HTMLSelectElement?'change':'input',{bubbles:true}));
    })()`)
    const submit = () => evaluate(`document.querySelector('.contact-form').requestSubmit()`)
    const fillRequired = async () => {
        for (const [name, value] of Object.entries({ name: 'Ana Silva', email: 'ana@example.com', subject: 'DOUBT', title: 'Contato', message: 'Gostaria de saber mais sobre a feira.' })) {
            await fill(name, value)
        }
    }
    await send('Runtime.enable')
    await send('Page.navigate', { url: server.resolvedUrls.local[0] + '__contact-validation' })
    await until(`Boolean(document.querySelector('.contact-form'))`)
    assert.equal(await evaluate(`Boolean(document.getElementById('contact-phone-hint'))`), false)
    await fillRequired()
    for (const email of ['ana', 'ana@gmail', 'ana@@gmail.com', '.ana@gmail.com', 'ana..silva@gmail.com', 'ana@-gmail.com']) {
        await fill('email', email)
        await submit()
        assert.match(await evaluate(`document.querySelector('[name=email]').validationMessage`), /e-mail válido/)
        assert.equal(await evaluate('window.messages.length'), 0)
    }
    await fill('email', 'ffffsf@gmail.com')
    for (const phone of ['efffsdf', '99999-9999', '8899999999', '(88) 99999-99999']) {
        await fill('phone', phone)
        await submit()
        assert.match(await evaluate(`document.querySelector('[name=phone]').validationMessage`), /telefone com DDD/)
        assert.equal(await evaluate('window.messages.length'), 0)
    }
    // The submission handler also protects calls that skip native browser validation.
    await evaluate(`document.querySelector('.contact-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`)
    await until(`document.querySelector('.contact-form-feedback')?.textContent.includes('telefone com DDD')`)
    assert.equal(await evaluate('window.messages.length'), 0)

    await fill('phone', '+55 (88) 99999-9999')
    assert.equal(await evaluate(`document.querySelector('[name=phone]').value`), '(88) 99999-9999')
    await submit()
    await until(`Boolean(document.querySelector('.contact-form-feedback.success'))`)
    assert.deepEqual(await evaluate('window.messages[0]'), {
        name: 'Ana Silva', email: 'ffffsf@gmail.com', phone: '(88) 99999-9999',
        subject: 'DOUBT', title: 'Contato', message: 'Gostaria de saber mais sobre a feira.',
    })
    assert.equal(await evaluate(`document.querySelector('[name=email]').value`), '')

    // Resetting the form clears prior validity errors, and phone remains optional.
    await fillRequired()
    await submit()
    await until('window.messages.length===2')
    assert.equal(await evaluate(`'phone' in window.messages[1]`), false)
    assert.equal(errors.length, 0, JSON.stringify(errors))
    console.log('Browser passed: invalid email/phone block requests; corrections, success reset, and optional phone work.')
} finally {
    socket?.close()
    browser.kill()
    await server.close()
}

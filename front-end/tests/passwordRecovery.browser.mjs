import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Real application and hash routes; HTTP responses are simulated, no email or live API calls.
const fixture = `<html><head></head><body><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import App from '/src/App.tsx'; import '/src/index.css';
window.calls=[]; window.responseMode='ok';
window.fetch=async(input,options={})=>{
 const path=new URL(input,location.origin).pathname;
 window.calls.push({path,body:options.body?JSON.parse(options.body):null});
 let status=200, body={message:'ok'};
 if(path==='/admin/refresh')status=401;
 if(path==='/admin/forgot-password')status=window.responseMode==='limited'?429:window.responseMode==='offline'?503:202;
 if(path==='/admin/reset-password'&&window.responseMode==='expired'){status=400;body={code:'INVALID_RESET_TOKEN'};}
 return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>`

const server = await createServer({ server: { host: '127.0.0.1', port: 5176, strictPort: true }, plugins: [{
    name: 'password-recovery-preview', configureServer(server) {
        server.middlewares.use('/__password-recovery', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await server.transformIndexHtml('/__password-recovery', fixture))
        })
    },
}] })
await server.listen()
const profile = await mkdtemp(join(tmpdir(), 'password-recovery-'))
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
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 12000)
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
    const fill = async (id, value) => evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)
    const submit = () => evaluate(`document.querySelector('.login-painel-form').requestSubmit()`)
    const navigate = async hash => { await evaluate(`location.hash=${JSON.stringify(hash)}`); await pause(120) }
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Page.navigate', { url: 'http://127.0.0.1:5176/__password-recovery#/admin/login' })
    await until(`Boolean(document.querySelector('.login-painel-forgot'))`)
    await evaluate(`document.querySelector('.login-painel-forgot').click()`)
    await until(`Boolean(document.getElementById('recovery-email'))`)
    await fill('recovery-email', 'admin@example.com')
    await evaluate(`window.responseMode='limited'`)
    await submit()
    await until(`document.querySelector('[role=alert]')?.textContent.includes('Muitas tentativas')`)
    await evaluate(`window.responseMode='offline'`)
    await submit()
    await until(`document.querySelector('[role=alert]')?.textContent.includes('indisponível')`)
    await evaluate(`window.responseMode='ok'`)
    await submit()
    await until(`Boolean(document.querySelector('.password-recovery-success'))`)
    assert.ok(await evaluate(`document.body.innerText.includes('Se este e-mail estiver associado')`))
    const output = new URL('../../output/password-recovery/', import.meta.url)
    await mkdir(output, { recursive: true })
    const token = 'a'.repeat(64)
    for (const mode of ['request', 'reset']) {
        await navigate(mode === 'request' ? '#/admin/esqueci-minha-senha' : '#/admin/redefinir-senha?token=' + token)
        if (mode === 'request') await evaluate(`document.querySelector('button.login-painel-forgot')?.click()`)
        await until(`Boolean(document.getElementById(${JSON.stringify(mode === 'request' ? 'recovery-email' : 'recovery-password')}))`)
        for (const width of [320, 375, 768, 1440]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
            await pause(120)
            const size = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,panel:document.querySelector('.password-recovery-panel').getBoundingClientRect().width})`)
            assert.ok(size.scroll <= size.width, JSON.stringify(size))
            if ([375, 1440].includes(width)) {
                const shot = await send('Page.captureScreenshot', { format: 'png' })
                await writeFile(new URL(`${mode}-${width}.png`, output), Buffer.from(shot.data, 'base64'))
            }
        }
    }
    await fill('recovery-password', 'NewPassword123')
    await fill('recovery-confirmation', 'DifferentPassword123')
    await submit()
    await until(`document.querySelector('[role=alert]')?.textContent.includes('não coincidem')`)
    assert.equal(await evaluate(`window.calls.filter(call=>call.path==='/admin/reset-password').length`), 0)
    await fill('recovery-confirmation', 'NewPassword123')
    await evaluate(`window.responseMode='expired'`)
    await submit()
    await until(`Boolean(document.querySelector('.password-recovery-invalid'))`)
    await evaluate(`document.querySelector('.password-recovery-action').click()`)
    await until(`Boolean(document.getElementById('recovery-email'))`)
    await navigate('#/admin/redefinir-senha?token=' + 'b'.repeat(64))
    await fill('recovery-password', 'NewPassword456')
    await fill('recovery-confirmation', 'NewPassword456')
    await evaluate(`window.responseMode='ok'`)
    await submit()
    await until(`document.querySelector('[role=status]')?.textContent.includes('Senha alterada')`)
    assert.ok(!(await evaluate('location.hash')).includes('token='))
    await evaluate(`document.querySelector('.password-recovery-back').click()`)
    await until(`Boolean(document.getElementById('login-email'))`)
    await navigate('#/admin/redefinir-senha')
    await until(`Boolean(document.querySelector('.password-recovery-invalid'))`)
    assert.equal(errors.length, 0, JSON.stringify(errors))
    console.log('Browser passed: login button, request, errors, confirmation, expiry, success, missing token, 320–1440px without horizontal overflow.')
} finally {
    socket?.close()
    browser.kill()
    await server.close()
}

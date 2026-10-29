import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Real application routes with simulated responses; no account or application data is changed.
const fixture = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import App from '/src/App.tsx'; import * as auth from '/src/services/authToken.ts'; import '/src/index.css';
window.auth=auth; window.calls=[]; window.hashes=[]; window.wrongPassword=false;
window.addEventListener('hashchange',()=>window.hashes.push(location.hash));
const mode=new URLSearchParams(location.search).get('mode');
window.hasRefresh=mode==='refresh'||mode==='cached';
if(mode==='cached'){auth.setAccessToken('old-access-token');auth.setAdminId('self');}
window.fetch=async(input,options={})=>{
 const path=new URL(input,location.origin).pathname;
 window.calls.push({path,method:options.method||'GET'});
 let status=200,body={message:'ok'};
 if(path==='/admin/refresh'){
   status=window.hasRefresh?403:401;body={code:'ADMIN_DISABLED'};window.hasRefresh=false;
 }else if(path==='/admin/login'){
   status=window.wrongPassword?401:403;body={code:window.wrongPassword?undefined:'ADMIN_DISABLED'};window.hasRefresh=false;
 }else if(path==='/admin/self')body={id:'self',name:'Ana',email:'ana@example.com',role:'ADMIN',active:false,profile_picture:null};
 else if(path==='/admin/logout')window.hasRefresh=false;
 else throw new Error('Unexpected request: '+path);
 return Response.json(body,{status});
};
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));
</script></body></html>`

const server = await createServer({ server: { host: '127.0.0.1', port: 5178, strictPort: true, hmr: false }, plugins: [{
    name: 'admin-session-preview', configureServer(server) {
        server.middlewares.use('/__admin-session', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await server.transformIndexHtml('/__admin-session', fixture))
        })
    },
}] })
await server.listen()
const profile = await mkdtemp(join(tmpdir(), 'admin-session-browser-'))
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
    const fill = (id, value) => evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`)
    let navigation = 0
    const navigate = (mode, route) => send('Page.navigate', { url: `http://127.0.0.1:5178/__admin-session?mode=${mode}&case=${++navigation}${route}` })
    const assertNotice = async () => {
        await until(`Boolean(document.getElementById('admin-disabled-title'))`)
        assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'Administrador desativado')
        assert.equal(await evaluate(`window.auth.getAccessToken()`), null)
        assert.equal(await evaluate(`window.auth.getAdminProfile()`), null)
        assert.equal(await evaluate(`Boolean(document.querySelector('.admin-area-checking,.login-painel-form,.admin-side-nav'))`), false)
        await pause(250)
        assert.ok(await evaluate(`window.hashes.length<=1 && window.calls.length<12`), 'Session must settle without redirect loops')
    }
    const returnToLogin = async () => {
        await evaluate(`document.querySelector('.admin-disabled-back').click()`)
        await until(`Boolean(document.getElementById('login-email'))`)
        assert.equal(await evaluate(`location.hash`), '#/admin/login')
        assert.equal(await evaluate(`document.getElementById('login-password').value`), '')
    }
    await send('Runtime.enable')
    await navigate('login', '#/admin/login')
    await until(`Boolean(document.getElementById('login-email'))`)
    await fill('login-email', 'ana@example.com')
    await fill('login-password', 'correct-password')
    await evaluate(`document.querySelector('.login-painel-form').requestSubmit()`)
    await assertNotice()
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.admin-disabled-back')).backgroundColor`), 'rgb(8, 117, 43)')
    for (const width of [320, 375, 768, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
        await pause(80)
        assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `Overflow at ${width}px`)
        if ([375, 1440].includes(width)) {
            const shot = await send('Page.captureScreenshot', { format: 'png' })
            await writeFile(join(profile, `admin-disabled-${width}.png`), Buffer.from(shot.data, 'base64'))
        }
    }
    await returnToLogin()
    await evaluate(`window.wrongPassword=true`)
    await fill('login-email', 'ana@example.com')
    await fill('login-password', 'wrong-password')
    await evaluate(`document.querySelector('.login-painel-form').requestSubmit()`)
    await until(`document.querySelector('.login-painel-error')?.textContent.includes('Confira seu e-mail')`)
    assert.equal(await evaluate(`Boolean(document.getElementById('admin-disabled-title'))`), false)

    for (const mode of ['refresh', 'cached']) {
        for (const route of ['#/admin/login', '#/admin', '#/minha-conta']) {
            await navigate(mode, route)
            await assertNotice()
            if (mode === 'cached') assert.ok(await evaluate(`window.calls.some(call=>call.path==='/admin/logout')`))
            await returnToLogin()
        }
    }
    assert.equal(errors.length, 0, JSON.stringify(errors))
    console.log('Browser passed: disabled login, wrong password, refresh and cached sessions on login/admin/account, return to login, and 320–1440px without overflow.')
    console.log(`Screenshots: ${profile}`)
} finally {
    socket?.close()
    browser.kill()
    await server.close()
}

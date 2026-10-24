import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Real components with simulated requests; no application data is changed.
const fixture = `<html><head></head><body><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import AdminEvents from '/src/pages/adminArea/AdminEvents.tsx';
import AdminSideNav from '/src/components/AdminSideNav/AdminSideNav.tsx';
import {setAccessToken,setAdminProfile} from '/src/services/authToken.ts';
import '/src/index.css'; import '/src/pages/adminArea/AdminArea.css';
setAccessToken('browser-test-only-token');
setAdminProfile({id:'self',name:'Ana Martins',role:'ADMIN',active:true});
window.calls=[]; window.failList=false;
const base={date:'2026-11-07',description:'Produtos da agricultura familiar.',startAt:'06:00:00',endAt:'12:00:00',
localAddress:'Praça em frente à Igreja Matriz',state:'PENDING',bannerImage:null,createdAt:'2026-10-24 10:00:00'};
window.events=[
{...base,id:'self-event',title:'Feira da Ana',administratorId:'self',administratorName:'Ana Martins',administratorActive:true},
{...base,id:'other-event',title:'Feira do Bruno',state:'CONCLUDED',administratorId:'other',administratorName:'Bruno Silva',administratorActive:true},
{...base,id:'inactive-event',title:'Feira histórica',administratorId:'inactive',administratorName:'Bruno Silva',administratorActive:false},
{...base,id:'self-past',title:'Feira anterior da Ana',state:'CONCLUDED',administratorId:'self',administratorName:'Ana Martins',administratorActive:true}];
window.fetch=async(input,options={})=>{
 const path=new URL(input,location.origin).pathname;
 window.calls.push({path,method:options.method||'GET',authorization:new Headers(options.headers).get('Authorization'),body:options.body?JSON.parse(options.body):null});
 let status=200,body=[];
 if(path==='/event/admin'){status=window.failList?500:200;body=window.events;}
 else if(path==='/event/other-event'&&options.method==='PATCH'){
   Object.assign(window.events.find(event=>event.id==='other-event'),JSON.parse(options.body));body={message:'ok'};
 }
 else if(!path.startsWith('/event/image/'))throw new Error('Unexpected request: '+path);
 return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')).render(React.createElement('main',{className:'admin-area'},
 React.createElement(AdminSideNav,{activeItem:'eventos',onSelect:()=>{}}),
 React.createElement('section',{className:'admin-area-content'},React.createElement(AdminEvents))));
</script></body></html>`

const server = await createServer({ server: { host: '127.0.0.1', port: 5177, strictPort: true }, plugins: [{
    name: 'event-administrators-preview', configureServer(server) {
        server.middlewares.use('/__event-administrators', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await server.transformIndexHtml('/__event-administrators', fixture))
        })
    },
}] })
await server.listen()
const profile = await mkdtemp(join(tmpdir(), 'event-administrators-'))
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
    const select = (index, value) => evaluate(`(()=>{const control=document.querySelectorAll('#admin-events-filters select')[${index}];control.value=${JSON.stringify(value)};control.dispatchEvent(new Event('change',{bubbles:true}));})()`)
    const titles = () => evaluate(`Array.from(document.querySelectorAll('.admin-event-card h3'),element=>element.textContent).sort()`)
    await send('Runtime.enable')
    await send('Page.navigate', { url: 'http://127.0.0.1:5177/__event-administrators' })
    await until(`document.querySelectorAll('.admin-event-card').length===4`)
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('.admin-event-card')).every(card=>card.textContent.includes('Cadastrado por:'))`))
    assert.equal(await evaluate(`window.calls[0].path`), '/event/admin')
    assert.equal(await evaluate(`window.calls[0].authorization`), 'Bearer browser-test-only-token')
    await evaluate(`document.querySelector('.admin-events-filter-button').click()`)
    await until(`Boolean(document.getElementById('admin-events-filters'))`)
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#admin-events-filters select')[0].options,option=>option.textContent)`),
        ['Todos os administradores', 'Meus eventos', 'Ana Martins', 'Bruno Silva', 'Bruno Silva (desativado)'])
    await select(0, 'mine')
    await until(`document.querySelectorAll('.admin-event-card').length===2`)
    assert.deepEqual(await titles(), ['Feira anterior da Ana', 'Feira da Ana'])
    await select(2, 'PENDING')
    await until(`document.querySelectorAll('.admin-event-card').length===1`)
    assert.deepEqual(await titles(), ['Feira da Ana'])
    assert.equal(await evaluate(`document.querySelector('.admin-events-filter-count').textContent`), '2')
    await evaluate(`document.querySelector('.admin-events-clear-filters').click()`)
    await until(`document.querySelectorAll('.admin-event-card').length===4`)
    await select(0, 'inactive')
    await until(`document.querySelectorAll('.admin-event-card').length===1`)
    assert.deepEqual(await titles(), ['Feira histórica'])
    await select(0, 'other')
    await until(`document.querySelector('.admin-event-card h3')?.textContent==='Feira do Bruno'`)
    assert.equal(await evaluate(`window.calls.filter(call=>call.path==='/event/admin').length`), 1)
    await evaluate(`document.querySelector('.admin-events-clear-filters').click()`)
    await until(`document.querySelectorAll('.admin-event-card').length===4`)
    const output = new URL('../../output/event-administrators/', import.meta.url)
    await mkdir(output, { recursive: true })
    for (const width of [320, 375, 760, 1051, 1100, 1200, 1440, 1894]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false })
        await pause(100)
        const size = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth})`)
        assert.ok(size.scroll <= size.width, JSON.stringify(size))
        if ([375, 1440].includes(width)) {
            const shot = await send('Page.captureScreenshot', { format: 'png' })
            await writeFile(new URL(`filters-${width}.png`, output), Buffer.from(shot.data, 'base64'))
        }
    }
    await evaluate(`document.querySelector('.admin-events-filter-button').click()`)
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false })
    await pause(100)
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(new URL('events-1440.png', output), Buffer.from(shot.data, 'base64'))

    // An edit by another admin must preserve the creator even when refreshing the list fails.
    await evaluate(`Array.from(document.querySelectorAll('.admin-event-card')).find(card=>card.querySelector('h3').textContent==='Feira do Bruno').querySelector('.is-edit').click()`)
    await until(`Boolean(document.querySelector('.admin-event-editor form'))`)
    await evaluate(`window.failList=true;document.querySelector('.admin-event-editor form').requestSubmit()`)
    await until(`!document.querySelector('.admin-event-editor')`)
    const authorAfterEdit = await evaluate(`Array.from(document.querySelectorAll('.admin-event-card')).find(card=>card.querySelector('h3').textContent==='Feira do Bruno').textContent`)
    assert.ok(authorAfterEdit.includes('Cadastrado por: Bruno Silva'))
    const patch = await evaluate(`window.calls.find(call=>call.method==='PATCH')`)
    assert.ok(!('administratorId' in patch.body))
    assert.ok(!('administratorName' in patch.body))
    assert.equal(errors.length, 0, JSON.stringify(errors))
    console.log('Browser passed: author names, own/other/inactive filters, combined status, clear, local filtering, preserved creator after editing, and 320–1894px without horizontal overflow.')
} finally {
    socket?.close()
    browser.kill()
    await server.close()
}

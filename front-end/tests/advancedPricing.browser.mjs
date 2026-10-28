import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Real calculator components; session/business requests are simulated.
const fixture = `<html><head></head><body><div id="root"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import PricingCalculatorPage from '/src/pages/pricingCalculatorPage/PricingCalculatorPage.tsx'; import '/src/index.css';
window.calls=[];
window.fetch=async(input,options={})=>{
 const path=new URL(input,location.origin).pathname;
 window.calls.push({path,body:options.body||null});
 return new Response(JSON.stringify({businessInfo:null}),{status:path.endsWith('/admin/refresh')?401:200,headers:{'Content-Type':'application/json'}});
};
createRoot(document.getElementById('root')).render(React.createElement(PricingCalculatorPage));
</script></body></html>`

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, plugins: [{
    name: 'advanced-pricing-test', configureServer(server) {
        server.middlewares.use('/__advanced-pricing', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html')
            res.end(await server.transformIndexHtml('/__advanced-pricing', fixture))
        })
    },
}] })
await server.listen()
const profile = await mkdtemp(join(tmpdir(), 'advanced-pricing-'))
const browser = spawn(process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let socket
try {
    let port
    for (let i = 0; i < 300; i++) {
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
        const input=Array.from(document.querySelectorAll('.advanced-calculator [name]')).find(element=>element.name===${JSON.stringify(name)});
        const prototype=input instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,${JSON.stringify(value)});
        input.dispatchEvent(new Event(input instanceof HTMLSelectElement?'change':'input',{bubbles:true}));
    })()`)
    const settle = () => evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))')
    const goTo = async step => {
        await evaluate(`document.querySelector('.advanced-calculator .markup-step-button[data-step="${step}"]').click()`)
        await settle()
    }
    const next = async () => {
        await evaluate(`document.querySelector('.advanced-calculator form').requestSubmit()`)
        await settle()
    }
    const submit = async () => { await goTo(5); await next() }
    const price = () => evaluate(`document.querySelector('.advanced-calculator .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`)
    const setControl = (id, value) => evaluate(`(()=>{
        const input=document.getElementById(${JSON.stringify(id)});
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});
        input.dispatchEvent(new Event('input',{bubbles:true}));
    })()`)
    const visibleStep = () => evaluate(`document.querySelector('.advanced-calculator fieldset:not([hidden])').dataset.step`)
    const simpleStep = () => evaluate(`document.querySelector('#markup-panel-main fieldset:not([hidden])').dataset.step`)
    const simpleGoTo = async step => {
        await evaluate(`document.querySelector('#markup-panel-main .markup-step-button[data-step="${step}"]').click()`)
        await settle()
    }
    const simpleNext = async () => {
        await evaluate(`document.querySelector('#markup-panel-main form').requestSubmit()`)
        await settle()
    }
    const openHelp = async (scope, name) => {
        await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(`${scope} [name]`)})).find(field=>field.name===${JSON.stringify(name)}).closest('.markup-field').querySelector('.markup-help-button').click()`)
        await until(`Boolean(document.querySelector('dialog[open]'))`)
        assert.ok(await evaluate(`document.querySelector('dialog[open]').matches(':modal')`))
        const content = await evaluate(`document.querySelector('dialog[open]').textContent`)
        assert.match(content, /Por exemplo/)
        assert.match(content, /Como muda o preço/)
        return content
    }
    const closeHelp = async () => {
        await evaluate(`document.querySelector('dialog[open] .markup-help-understood').click()`)
        await settle()
        assert.equal(await evaluate(`Boolean(document.querySelector('dialog[open]'))`), false)
        assert.equal(await evaluate(`document.activeElement.classList.contains('markup-help-button')`), true)
    }
    await send('Runtime.enable')
    await send('Page.navigate', { url: server.resolvedUrls.local[0] + '__advanced-pricing' })
    await until(`Boolean(document.getElementById('markup-tab-main'))`)
    assert.equal(await simpleStep(), '0')
    await simpleGoTo(2)
    assert.equal(await simpleStep(), '0')
    assert.equal(await evaluate('document.activeElement.name'), 'materialCost')
    await setControl('markup-materialCost', '30,00')
    await setControl('markup-productionHours', '2')
    await setControl('markup-hourlyRate', '20,00')
    await simpleNext()
    assert.equal(await simpleStep(), '1')
    await evaluate(`document.querySelector('#markup-panel-main .markup-step-back').click()`)
    await settle()
    assert.equal(await simpleStep(), '0')
    assert.equal(await evaluate(`document.getElementById('markup-materialCost').value`), '30,00')
    await openHelp('#markup-panel-main', 'materialCost')
    await closeHelp()
    await simpleNext()
    await simpleNext()
    assert.equal(await simpleStep(), '1')
    assert.equal(await evaluate('document.activeElement.name'), 'monthlyRevenue')
    await setControl('markup-monthlyFixedExpenses', '1.000,00')
    await setControl('markup-monthlyRevenue', '10.000,00')
    await simpleNext()
    assert.equal(await simpleStep(), '2')
    await setControl('markup-variableExpenses-value', '5')
    await setControl('markup-profit-value', '30')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$127,27')
    assert.equal(await evaluate(`document.querySelectorAll('#markup-panel-main button[type=submit]').length`), 0)
    await evaluate(`document.querySelector('#markup-panel-main .markup-clear').click()`)
    await settle()
    assert.equal(await simpleStep(), '0')
    assert.equal(await evaluate(`document.getElementById('markup-materialCost').value`), '')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$—')
    await evaluate(`document.querySelector('#markup-panel-main .markup-example').click()`)
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$127,27')
    assert.equal(await evaluate(`document.querySelectorAll('#markup-panel-main fieldset:not([hidden])').length`), 1)
    await simpleGoTo(1)
    assert.match(await openHelp('#markup-panel-main', 'monthlyRevenue'), /faturamento/)
    await closeHelp()
    await setControl('markup-monthlyRevenue', '20.000,00')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$116,67')
    await setControl('markup-monthlyRevenue', '0')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$—')
    await setControl('markup-monthlyRevenue', '10.000,00')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$127,27')
    await setControl('markup-monthlyFixedExpenses', '0')
    await setControl('markup-monthlyRevenue', '20.000,00')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$107,69')
    assert.match(await evaluate(`document.getElementById('markup-revenue-effect').textContent`), /não altera/)
    await evaluate(`document.querySelector('#markup-panel-main .markup-example').click()`)
    await simpleGoTo(2)
    await setControl('markup-profit-value', '12,5')
    assert.equal(await evaluate(`document.getElementById('markup-profit').value`), '12.5')
    await setControl('markup-variableExpenses', '7.4')
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main [name=variableExpenses]').value`), '7.4')
    await evaluate(`document.getElementById('markup-variableExpenses').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`)
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main [name=variableExpenses]').value`), '7.5')
    await setControl('markup-profit-value', '100')
    await simpleNext()
    assert.equal(await evaluate(`document.getElementById('markup-profit-value').getAttribute('aria-invalid')`), 'true')
    await evaluate(`document.querySelector('#markup-panel-main .markup-example').click()`)
    await evaluate(`document.getElementById('markup-tab-advanced').click()`)
    assert.equal(await visibleStep(), '0')
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-calculator fieldset:not([hidden])').length`), 1)
    await goTo(3)
    assert.equal(await visibleStep(), '0')
    assert.equal(await evaluate('document.activeElement.name'), 'productName')
    await fill('productName', 'Bolo caseiro')
    await fill('producedQuantity', '2')
    await fill('productionTime', '2')
    await next()
    assert.equal(await visibleStep(), '1')
    await evaluate(`document.querySelector('.advanced-calculator .markup-step-back').click()`)
    assert.equal(await visibleStep(), '0')
    assert.equal(await evaluate(`document.querySelector('.advanced-calculator [name=productName]').value`), 'Bolo caseiro')
    await next()
    await next()
    assert.equal(await visibleStep(), '1')
    assert.ok(await evaluate('document.activeElement.name.endsWith(".name")'))
    await evaluate(`document.querySelector('.advanced-calculator .markup-example').click()`)
    await until(`document.querySelector('.advanced-calculator .markup-price').textContent.includes('34,85')`)
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-rows > .advanced-item').length`), 6)
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-formula-steps li').length`), 13)
    assert.ok(await evaluate(`document.querySelector('.advanced-summary').textContent.includes('18,33')`))
    assert.ok(await evaluate(`document.querySelector('.advanced-summary').textContent.includes('9,17')`))
    for (let step = 0; step < 6; step++) {
        await goTo(step)
        const names = await evaluate(`Array.from(document.querySelectorAll('.advanced-calculator fieldset:not([hidden]) [name]')).map(field=>field.name).filter(name=>name!=='productName'&&!name.endsWith('.name'))`)
        for (const name of names) {
            await openHelp('.advanced-calculator', name)
            await closeHelp()
        }
    }
    await goTo(0)
    await openHelp('.advanced-calculator', 'producedQuantity')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await until(`!document.querySelector('dialog[open]')`)
    await settle()
    assert.equal(await evaluate(`document.activeElement.classList.contains('markup-help-button')`), true)
    assert.equal(await visibleStep(), '0')
    assert.equal(await price(), 'R$34,85')
    await openHelp('.advanced-calculator', 'productionTime')
    await evaluate(`document.querySelector('dialog[open] .markup-help-close').click()`)
    await settle()
    assert.equal(await evaluate(`Boolean(document.querySelector('dialog[open]'))`), false)
    await goTo(5)
    assert.equal(await visibleStep(), '5')
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-calculator fieldset:not([hidden]) input[type=range]').length`), 3)
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-calculator button[type=submit]').length`), 0)
    await fill('monthlyRevenue', '20.000,00')
    assert.equal(await price(), 'R$31,94')
    assert.match(await evaluate(`document.getElementById('advanced-revenue-effect').textContent`), /5%/)
    await fill('monthlyRevenue', '0')
    assert.equal(await price(), 'R$—')
    assert.equal(await evaluate(`document.getElementById('advanced-monthlyRevenue').getAttribute('aria-invalid')`), 'true')
    await fill('monthlyRevenue', '555555')
    assert.notEqual(await price(), 'R$—')
    await fill('monthlyRevenue', '10.000,00')
    assert.equal(await price(), 'R$34,85')
    await goTo(3)
    await evaluate(`document.querySelector('fieldset[data-step="3"] .advanced-remove').click()`)
    await settle()
    await evaluate(`document.querySelector('fieldset[data-step="3"] .advanced-remove').click()`)
    await settle()
    await goTo(4)
    await evaluate(`document.querySelector('fieldset[data-step="4"] .advanced-remove').click()`)
    await goTo(5)
    const noFixedPrice = await price()
    assert.equal(noFixedPrice, 'R$29,49')
    await fill('monthlyRevenue', '20.000,00')
    assert.equal(await price(), noFixedPrice)
    assert.match(await evaluate(`document.getElementById('advanced-revenue-effect').textContent`), /Sem gastos fixos/)
    await evaluate(`document.querySelector('.advanced-calculator .markup-example').click()`)
    await goTo(5)
    await fill('profit', '12,5')
    assert.notEqual(await price(), 'R$—')
    assert.notEqual(await price(), 'R$34,85')
    assert.equal(await evaluate(`document.getElementById('advanced-profit').value`), '12.5')
    await setControl('advanced-profit', '22.4')
    assert.equal(await evaluate(`document.querySelector('.advanced-calculator [name=profit]').value`), '22.4')
    await evaluate(`document.getElementById('advanced-profit').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`)
    assert.equal(await evaluate(`document.querySelector('.advanced-calculator [name=profit]').value`), '22.5')
    const variableName = await evaluate(`document.querySelector('.advanced-calculator .advanced-expense-row .markup-percentage-field input[name]').name`)
    await fill(variableName, '4,25')
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`advanced-${variableName}`)}).value`), '4.25')
    await setControl(`advanced-${variableName}`, '6.3')
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`advanced-${variableName}-value`)}).value`), '6.3')
    await fill(variableName, '100')
    await submit()
    assert.equal(await price(), 'R$—')
    assert.equal(await evaluate('document.activeElement.name'), variableName)
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(`advanced-${variableName}-value`)}).getAttribute('aria-invalid')`), 'true')
    await evaluate(`document.querySelector('.advanced-calculator .markup-example').click()`)
    await evaluate(`document.getElementById('markup-tab-main').click()`)
    assert.equal(await evaluate(`document.querySelector('#markup-panel-main .markup-price').textContent.replaceAll(String.fromCharCode(160),'').replaceAll(' ','')`), 'R$127,27')
    await evaluate(`document.getElementById('markup-tab-advanced').click()`)
    assert.equal(await price(), 'R$34,85')

    await fill('producedQuantity', '0')
    await submit()
    assert.equal(await price(), 'R$—')
    assert.equal(await evaluate('document.activeElement.name'), 'producedQuantity')
    assert.ok(await evaluate(`document.querySelector('.advanced-calculator [name=producedQuantity]').getAttribute('aria-invalid')==='true'`))
    await fill('producedQuantity', '2')
    await fill('profit', '85')
    await submit()
    assert.equal(await price(), 'R$—')
    assert.match(await evaluate(`document.getElementById('advanced-profit-error').textContent`), /menos de 100/)
    await fill('profit', '30')
    await fill('productionTime', '120')
    await fill('timeUnit', 'minute')
    await submit()
    assert.equal(await price(), 'R$34,85')

    await goTo(1)
    await evaluate(`Array.from(document.querySelectorAll('.advanced-add')).find(button=>button.textContent.includes('Adicionar insumo')).click()`)
    const ingredientPrefix = await evaluate(`document.querySelector('.advanced-rows > .advanced-item:last-child input').name.replace(/\.name$/,'')`)
    for (const [field, value] of Object.entries({ name: 'Óleo', purchasedQuantity: '1', purchasedUnit: 'l', purchaseValue: '10,00', usedQuantity: '100', usedUnit: 'ml' })) {
        await fill(`${ingredientPrefix}.${field}`, value)
    }
    await submit()
    assert.equal(await price(), 'R$35,76')
    await fill(`${ingredientPrefix}.usedUnit`, 'g')
    await submit()
    assert.equal(await price(), 'R$—')
    assert.equal(await evaluate('document.activeElement.name'), `${ingredientPrefix}.usedUnit`)
    await fill(`${ingredientPrefix}.usedUnit`, 'ml')
    await submit()
    assert.equal(await price(), 'R$35,76')
    await goTo(1)
    await evaluate(`document.querySelector('.advanced-rows > .advanced-item:last-child .advanced-remove').click()`)
    await submit()
    assert.equal(await price(), 'R$34,85')

    await evaluate(`document.querySelector('.advanced-calculator .markup-clear').click()`)
    assert.equal(await price(), 'R$—')
    assert.equal(await evaluate(`document.querySelector('.advanced-calculator [name=productName]').value`), '')
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-rows > .advanced-item').length`), 1)
    await submit()
    assert.equal(await evaluate('document.activeElement.name'), 'productName')
    // Complete the empty form without an example or a final calculation action.
    await fill('productName', 'Bolo caseiro')
    await fill('producedQuantity', '2')
    await fill('productionTime', '2')
    await next()
    const firstIngredient = await evaluate(`document.querySelector('.advanced-rows input').name.slice(0,-5)`)
    for (const [field, value] of Object.entries({ name: 'Farinha', purchasedQuantity: '1', purchaseValue: '10,00', usedQuantity: '500' })) {
        await fill(`${firstIngredient}.${field}`, value)
    }
    await next()
    await fill('monthlyPay', '1.600,00')
    await fill('hoursPerDay', '8')
    await fill('daysPerMonth', '20')
    await next()
    await next()
    await next()
    assert.equal(await visibleStep(), '5')
    await fill('monthlyRevenue', '10.000,00')
    assert.equal(await price(), 'R$12,50')
    assert.equal(await evaluate(`document.querySelectorAll('.advanced-calculator button[type=submit]').length`), 0)
    await fill('profit', '20')
    assert.equal(await price(), 'R$15,63')
    await evaluate(`document.querySelector('.advanced-calculator .markup-example').click()`)
    assert.equal(await visibleStep(), '0')
    await evaluate(`document.fonts.ready.then(()=>true)`)
    for (const width of [320, 375, 768, 1024, 1440]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
        await evaluate('window.scrollTo(0,0)')
        await pause(100)
        const size = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth})`)
        assert.ok(size.scroll <= size.width, JSON.stringify(size))
        await goTo(5)
        const percentageSize = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth})`)
        assert.ok(percentageSize.scroll <= percentageSize.width, JSON.stringify(percentageSize))
        await openHelp('.advanced-calculator', 'monthlyRevenue')
        const dialogSize = await evaluate(`(()=>{const dialog=document.querySelector('dialog[open]');const r=dialog.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,top:r.top,width:innerWidth,height:innerHeight,scroll:dialog.scrollWidth,client:dialog.clientWidth}})()`)
        assert.ok(dialogSize.left >= 0 && dialogSize.right <= dialogSize.width && dialogSize.top >= 0 && dialogSize.bottom <= dialogSize.height, JSON.stringify(dialogSize))
        assert.ok(dialogSize.scroll <= dialogSize.client, JSON.stringify(dialogSize))
        if ([375, 1440].includes(width)) {
            const helpShot = await send('Page.captureScreenshot', { format: 'png' })
            await writeFile(new URL(`../node_modules/.tmp/calculator-help-${width}.png`, import.meta.url), Buffer.from(helpShot.data, 'base64'))
        }
        await closeHelp()
        await goTo(0)
        if ([375, 1440].includes(width)) {
            const shot = await send('Page.captureScreenshot', { format: 'png' })
            await writeFile(new URL(`../node_modules/.tmp/advanced-pricing-${width}.png`, import.meta.url), Buffer.from(shot.data, 'base64'))
            await goTo(5)
            await evaluate(`document.querySelector('.advanced-calculator form').scrollIntoView()`)
            const percentages = await send('Page.captureScreenshot', { format: 'png' })
            await writeFile(new URL(`../node_modules/.tmp/advanced-percentages-${width}.png`, import.meta.url), Buffer.from(percentages.data, 'base64'))
            await evaluate(`document.getElementById('markup-tab-main').click();window.scrollTo(0,0)`)
            await simpleGoTo(0)
            await evaluate('window.scrollTo(0,0)')
            const simple = await send('Page.captureScreenshot', { format: 'png' })
            await writeFile(new URL(`../node_modules/.tmp/simple-pricing-${width}.png`, import.meta.url), Buffer.from(simple.data, 'base64'))
            await evaluate(`document.getElementById('markup-tab-advanced').click()`)
            await goTo(0)
        }
    }
    assert.equal(await evaluate('window.calls.some(call=>call.body!==null)'), false)
    assert.equal(errors.length, 0, JSON.stringify(errors))
    console.log('Browser passed: automatic first results without a calculation button, steps/back/validation in both calculators, contextual help, modal focus/Escape, percentages, and responsive pages/dialogs at 320–1440px.')
} finally {
    socket?.close()
    browser.kill()
    await server.close()
}

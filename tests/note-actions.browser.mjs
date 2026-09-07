// Run against the agent-browser test session's `get cdp-url`.
// Only highlights GET reaches the server. All likes/views (including mutations)
// are mocked, so verification cannot add activity or inflate real view counts.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const socket = new WebSocket(process.argv[2])
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
let nextId = 0
const pending = new Map()
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data)
  if (!message.id) return
  const request = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) request.reject(new Error(JSON.stringify(message.error)))
  else request.resolve(message.result)
}
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
}
const { targetInfos } = await send('Target.getTargets')
const target = targetInfos.find(target => target.type === 'page')
const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
const command = (method, params) => send(method, params, sessionId)
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out: ${expression}`)
}

function installMocks(config) {
  const realFetch = window.fetch.bind(window)
  const state = window.__notePillTest = { gates: {}, samples: [] }
  const hold = name => new Promise(resolve => { state.gates[name] = resolve })
  const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  window.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input, location.href)
    if (url.pathname === '/api/notes/highlights') {
      if (options?.method && options.method !== 'GET') throw new Error('Test blocks highlight mutations')
      const response = await realFetch(input, options)
      const data = await response.json()
      await hold('highlights')
      if (config.failure) throw new Error('Simulated highlight request failure')
      data.highlights = Array.from({ length: config.highlights }, (_, index) => ({
        id: `test-${index}`, start: index * 30, end: index * 30 + 10,
        exact: 'Test quote', prefix: '', suffix: '', count: 1, mine: false, attributions: [],
      }))
      return json(data)
    }
    if (url.pathname === '/api/module-likes') {
      if (options?.method === 'POST') return json({ count: config.likes + 1, userLikes: 1, hasLiked: true, canLike: true })
      await hold('likes')
      if (config.failure) throw new Error('Simulated like request failure')
      return json(Object.fromEntries(url.searchParams.get('ids').split(',').map(id => [id, {
        count: config.likes, userLikes: 0, hasLiked: false, canLike: true,
      }])))
    }
    if (url.pathname === '/api/notes/views') {
      await hold('views')
      if (config.failure) throw new Error('Simulated view request failure')
      return json({ count: config.views })
    }
    return realFetch(input, options)
  }
  state.capture = () => {
    const start = performance.now()
    const frame = () => {
      const pill = document.querySelector('[data-note-actions-pill]')
      const style = getComputedStyle(pill)
      state.samples.push({
        elapsed: performance.now() - start,
        opacity: Number(style.opacity),
        y: style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m42,
        width: pill.getBoundingClientRect().width,
        blur: style.backdropFilter,
        counts: [...pill.querySelectorAll('[data-note-count-value]')].map(node => node.textContent),
      })
      if (performance.now() - start < 1800) requestAnimationFrame(frame)
      else state.done = true
    }
    requestAnimationFrame(frame)
  }
}

await command('Page.enable')
const origin = process.argv[3] || 'http://localhost:3000'
let checks = 0
const scripts = new Set()
const check = (condition, message) => { assert.ok(condition, message); checks++ }
try {
  for (const config of [
    { name: 'desktop', width: 1440, height: 1000, likes: 12, highlights: 3, views: 1431 },
    { name: 'mobile-zero', width: 390, height: 844, likes: 0, highlights: 0, views: 0 },
    { name: 'reduced-motion', width: 1440, height: 1000, likes: 12, highlights: 3, views: 1431, reduced: true },
    { name: 'failure', width: 1440, height: 1000, likes: 0, highlights: 0, views: 0, failure: true },
  ]) {
    await command('Emulation.setDeviceMetricsOverride', { width: config.width, height: config.height, deviceScaleFactor: 1, mobile: config.width < 810 })
    await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: config.reduced ? 'reduce' : 'no-preference' }, { name: 'prefers-color-scheme', value: 'dark' }] })
    const { identifier } = await command('Page.addScriptToEvaluateOnNewDocument', { source: `(${installMocks})(${JSON.stringify(config)})` })
    scripts.add(identifier)
    await command('Page.navigate', { url: `${origin}/notes/a-quilt-for-generations` })
    await command('Page.bringToFront')
    await waitFor('Boolean(window.__notePillTest?.gates.highlights)')
    const hidden = () => evaluate(`(() => { const p = document.querySelector('[data-note-actions-pill]'); return p.inert && p.getAttribute('aria-hidden') === 'true' && getComputedStyle(p).visibility === 'hidden' })()`)
    check(await hidden(), `${config.name}: hidden and non-interactive before highlights load`)
    await evaluate('window.__notePillTest.gates.highlights()')
    await waitFor('Boolean(window.__notePillTest.gates.likes && window.__notePillTest.gates.views)')
    check(await hidden(), `${config.name}: waits for likes and views`)
    await evaluate('window.__notePillTest.gates.likes()')
    await new Promise(resolve => setTimeout(resolve, 250))
    check(await hidden(), `${config.name}: still waits for the slowest count`)
    await evaluate('window.__notePillTest.capture(); window.__notePillTest.gates.views()')
    await waitFor('Boolean(window.__notePillTest.done)')
    const samples = await evaluate('window.__notePillTest.samples')
    const last = samples.at(-1)
    check(last.opacity === 1 && Math.abs(last.y) < 0.01, `${config.name}: settles fully visible at rest`)
    check(last.blur === 'blur(40px)', `${config.name}: backdrop blur remains enabled`)
    // The hidden loading layout can resize as data arrives; the visible pill
    // must reserve its final width for the entire entrance and count-up.
    const visibleWidths = samples.filter(s => s.opacity > 0).map(s => s.width)
    check(Math.max(...visibleWidths) - Math.min(...visibleWidths) < 1, `${config.name}: width stays stable during entrance/count-up`)
    if (!config.reduced) {
      check(samples.some(s => s.opacity > 0 && s.opacity < 1), `${config.name}: opacity fades in`)
      check(samples.some(s => s.y > 0 && s.y < 8), `${config.name}: gently rises`)
      check(samples.some(s => s.y < 0 && s.y > -2), `${config.name}: subtle spring overshoot`)
    }
    if (config.name === 'desktop') {
      check(last.counts.join() === '12,3,1.4K', 'nonzero counts finish at the loaded values')
      check(samples.some(s => s.counts.join() === '0,0,0'), 'all three counters begin at zero')
      check(samples.some(s => Number(s.counts[0]) > 0 && Number(s.counts[0]) < 12), 'likes count up')
      check(samples.some(s => Number(s.counts[1]) > 0 && Number(s.counts[1]) < 3), 'highlights count up')
      check(samples.some(s => Number(s.counts[2]) > 0 && Number(s.counts[2]) < 1000), 'views count up')
      await evaluate('window.scrollTo(0, 700)')
      const screenshot = await command('Page.captureScreenshot', { format: 'png' })
      await writeFile('/tmp/note-pill-entrance-desktop.png', Buffer.from(screenshot.data, 'base64'))
    }
    if (config.reduced) {
      check(samples.filter(s => s.opacity === 1).every(s => s.counts.join() === '12,3,1.4K' && s.y === 0), 'reduced motion skips bounce and counting')
    }
    if (config.name === 'mobile-zero') {
      check(last.counts.join() === '0,0,0', 'zero counts never increment')
      check(await evaluate(`(() => { const p = document.querySelector('[data-note-actions-pill]'); return [...p.querySelectorAll('[data-note-count]')].slice(0, 2).every(el => getComputedStyle(el).visibility === 'hidden') })()`), 'zero likes and highlights remain hidden')
      await evaluate(`document.querySelector('[aria-label="0 highlighted passages. Show highlights"]').click()`)
      await waitFor(`Boolean(document.querySelector('[role="dialog"]'))`)
      check(await evaluate(`document.querySelector('[role="dialog"]').textContent.includes('Select text in the note to highlight it.')`), 'mobile highlight sheet still opens with the empty state')
    }
    if (config.failure) check(last.counts.slice(-2).join() === '—,—', 'failed counts remain unavailable, not fabricated zeros')
    console.log(`PASS ${config.name}`)
    await command('Page.removeScriptToEvaluateOnNewDocument', { identifier })
    scripts.delete(identifier)
  }
  console.log(`PASS ${checks} browser checks`)
} finally {
  for (const identifier of scripts) await command('Page.removeScriptToEvaluateOnNewDocument', { identifier })
  socket.close()
}

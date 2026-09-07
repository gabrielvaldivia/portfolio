// Run with the CDP URL of an agent-browser session on /admin/login.
// Renders the real moderation component with the real admin CSS. Only the CMS
// document provider/Button adapter and API data are fixtures. No live writes.
import assert from 'node:assert/strict'
import { build } from 'esbuild'

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
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId
  pending.set(id, { resolve, reject })
  socket.send(JSON.stringify({ id, method, params, sessionId }))
})
const { targetInfos } = await send('Target.getTargets')
const target = targetInfos.find(target => target.type === 'page' && target.url.includes('/admin/login'))
assert.ok(target, 'Open /admin/login first; never run in a real note editor')
const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
const command = (method, params) => send(method, params, sessionId)
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out: ${expression}`)
}
const click = label => evaluate(`(() => { const button = [...(document.querySelector('[role="alertdialog"]') || document.querySelector('#moderation-fixture')).querySelectorAll('button')].find(button => button.textContent === ${JSON.stringify(label)}); button?.focus(); button?.click(); })()`)
let checks = 0
function check(value, description) { assert.ok(value, description); checks++; console.log(`PASS ${description}`) }

try {
  await command('Page.bringToFront')
  const auth = await evaluate(`(async () => {
    const response = await fetch('/api/notes/highlights/moderation?noteId=1', { credentials: 'omit' });
    return { status: response.status, cache: response.headers.get('cache-control'), data: await response.json() };
  })()`)
  check(auth.status === 401 && auth.cache.includes('no-store') && !auth.data.passages, 'real admin endpoint denies anonymous reads without leaking identifiers')

  const bundle = await build({
    absWorkingDir: process.cwd(), write: false, bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { NoteHighlightModeration } from './src/components/admin/NoteHighlightModeration';
      const endpoint = '/api/notes/highlights/moderation';
      const reader = { id: 'a'.repeat(64), location: 'Newburgh, NY', createdAt: '2026-09-07T12:00:00Z' };
      const state = window.__moderationFixture = { requests: [], fail: false, data: {
        paused: false, blockedReaders: [], passages: [{ key: 'b'.repeat(64), quote: 'Effort is evidence that it took longer to create something than it takes to consume it.', readers: [reader] }]
      }};
      const fetchBefore = window.fetch;
      window.fetch = async (input, options) => {
        const url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname !== endpoint) throw new Error('Fixture blocks all other requests');
        if (options?.method === 'POST') {
          const action = JSON.parse(options.body); state.requests.push(action);
          if (state.fail) return Response.json({ error: 'Simulated error: please try again.' }, { status: 503 });
          if (action.action === 'pause') state.data.paused = action.paused;
          if (action.action === 'remove-passage' || action.action === 'remove-reader' || action.action === 'block-reader') state.data.passages = [];
          if (action.action === 'block-reader') state.data.blockedReaders = [reader];
          if (action.action === 'unblock-reader') state.data.blockedReaders = [];
        }
        return Response.json(state.data);
      };
      const mount = document.createElement('div'); mount.id = 'moderation-fixture'; mount.className = 'collection-edit collection-edit--notes';
      const oldChildren = [...document.body.children].filter(node => node instanceof HTMLElement && !['SCRIPT','STYLE'].includes(node.tagName));
      const displays = oldChildren.map(node => node.style.display);
      oldChildren.forEach(node => node.style.display = 'none');
      document.body.append(mount);
      const root = createRoot(mount);
      root.render(<main className="document-fields__edit"><NoteHighlightModeration /></main>);
      state.cleanup = () => { root.unmount(); mount.remove(); oldChildren.forEach((node, i) => node.style.display = displays[i]); window.fetch = fetchBefore; };
    ` },
    plugins: [{ name: 'cms-provider-fixture', setup(builder) {
      builder.onResolve({ filter: /^@payloadcms\/ui$/ }, () => ({ path: 'cms-fixture', namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'tsx', resolveDir: process.cwd(), contents: `
        import React from 'react';
        export const useDocumentInfo = () => ({ id: 1 });
        export const Button = React.forwardRef(({buttonStyle = 'primary', size = 'medium', children, ...props}, ref) =>
          <button ref={ref} {...props} className={'btn btn--style-' + buttonStyle + ' btn--size-' + size}>{children}</button>);
      ` }))
    } }],
  })
  await evaluate(bundle.outputFiles[0].text)
  await waitFor(`document.querySelector('#moderation-fixture blockquote')`)
  check(await evaluate(`document.querySelector('#moderation-fixture').textContent.includes('15%')`), 'quota explanation renders')
  await click('Remove passage')
  await waitFor(`document.querySelector('[role="alertdialog"]')`)
  check(await evaluate(`document.activeElement.textContent === 'Cancel'`), 'destructive confirmation focuses Cancel')
  check(await evaluate(`window.__moderationFixture.requests.length === 0`), 'opening a confirmation does not delete anything')
  await click('Cancel')
  await waitFor(`!document.querySelector('[role="alertdialog"]')`)
  check(await evaluate(`document.querySelector('#moderation-fixture blockquote') !== null`), 'Cancel preserves the passage')
  await evaluate(`document.querySelector('#moderation-fixture input[type="checkbox"]').click()`)
  await waitFor(`window.__moderationFixture.requests.length === 1 && document.querySelector('input[type="checkbox"]').checked`)
  check(await evaluate(`document.querySelector('#moderation-fixture blockquote') !== null`), 'pause preserves the existing passage')
  await evaluate(`document.querySelector('#moderation-fixture summary').click()`)
  await click('Remove and block')
  await waitFor(`document.querySelector('[role="alertdialog"]')`)
  await evaluate(`window.__moderationFixture.fail = true`)
  await click('Remove and block')
  await waitFor(`document.querySelector('[role="alertdialog"] [role="alert"]')`)
  check(await evaluate(`document.querySelector('#moderation-fixture blockquote') !== null`), 'server failure keeps the passage and confirmation open')
  await evaluate(`window.__moderationFixture.fail = false`)
  await click('Remove and block')
  await waitFor(`!document.querySelector('[role="alertdialog"]') && document.querySelector('#blocked-highlight-readers')`)
  check(await evaluate(`!document.querySelector('#moderation-fixture blockquote')`), 'confirmed block updates the quote list and blocked browser list')
  await waitFor(`document.activeElement.id === 'highlight-moderation-title'`)
  check(true, 'focus returns safely when the triggering row is removed')
  await click('Unblock')
  await waitFor(`!document.querySelector('#blocked-highlight-readers')`)
  check(await evaluate(`window.__moderationFixture.requests.at(-1).action === 'unblock-reader'`), 'Unblock targets the selected anonymous browser')
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  check(await evaluate(`document.querySelector('#moderation-fixture').scrollWidth <= innerWidth`), 'moderation panel fits mobile without horizontal overflow')
  console.log(`${checks} browser checks passed. Live moderation writes: 0.`)
} finally {
  await evaluate(`window.__moderationFixture?.cleanup()`)
  await command('Emulation.clearDeviceMetricsOverride')
  socket.close()
}

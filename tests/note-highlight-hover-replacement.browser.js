// Run on /notes/the-new-cost-of-creation with agent-browser eval.
// Every highlight request is intercepted after the initial read.
(async () => {
  const root = document.querySelector('[data-note-highlight-body]')
  const paragraphs = [...root.querySelectorAll('p')].slice(0, 2)
  const originalFetch = window.fetch.bind(window)
  const response = await originalFetch('/api/notes/highlights?noteId=54').then(r => r.json())
  const first = paragraphs[0].textContent
  const second = paragraphs[1].textContent
  const split = first.indexOf('processing')
  const reader = {location: 'Singapore', createdAt: '2026-09-10T12:00:00.000Z'}
  const mark = (id, exact, start) => ({id, exact, start, end: start + exact.length, prefix: '', suffix: '', count: 1, mine: false, attributions: [reader]})
  const marks = [mark('short', first.slice(0, split), 0), mark('whole', first, 0), mark('neighbor', second, first.length)]
  const previousVisibility = localStorage.getItem('gv-note-highlights-visible-v2')
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  const checks = []
  const check = (label, pass) => {if (!pass) throw new Error(label); checks.push(label)}
  const textRange = (index, start, end) => {
    const range = document.createRange()
    range.setStart(paragraphs[index].firstChild, start)
    range.setEnd(paragraphs[index].firstChild, end)
    return range
  }
  const hover = (index, offset) => {
    const rect = textRange(index, offset, offset + 1).getClientRects()[0]
    paragraphs[index].dispatchEvent(new PointerEvent('pointermove', {bubbles: true, pointerType: 'mouse', clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2}))
  }
  const lines = () => [...root.querySelectorAll(':scope > [data-note-highlight-underline] > div')].map(el => el.getBoundingClientRect())
  const overlaps = (line, rect) => Math.abs(line.top - rect.bottom) < 3 && line.right > rect.left + 1 && line.left < rect.right - 1
  const covers = range => [...range.getClientRects()].some(rect => lines().some(line => overlaps(line, rect)))
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    if (url.pathname !== '/api/notes/highlights') return originalFetch(input, init)
    if ((init?.method || 'GET') !== 'GET') throw new Error('Writes are blocked by this browser test.')
    return Response.json({...response, highlights: marks})
  }
  try {
    localStorage.setItem('gv-note-highlights-visible-v2', JSON.stringify({you:true,them:true}))
    window.dispatchEvent(new StorageEvent('storage', {key:'gv-note-highlights-visible-v2'}))
    window.dispatchEvent(new Event('focus'))
    await pause(500)
    paragraphs[0].scrollIntoView({block:'center',behavior:'instant'})
    await pause(200)
    const whole = textRange(0, 0, first.length)
    const short = textRange(0, 0, split)
    const remainder = textRange(0, split, first.length)
    const neighbor = textRange(1, 0, second.length)
    check('merged community passages begin underlined', covers(whole) && covers(neighbor))
    hover(0, 2)
    await pause(300)
    check('hover draws the filled highlight', Boolean(root.querySelector('[data-note-highlight-hover] [data-highlighters-overlay]')))
    check('hover removes the underline only under the short overlapping passage', !covers(short) && covers(remainder))
    check('the neighboring passage stays underlined', covers(neighbor))
    hover(0, split + 2)
    await pause(300)
    check('moving to the longer passage replaces its complete underline', !covers(whole) && covers(neighbor))
    hover(1, 2)
    await pause(300)
    check('switching passages restores the first underline and removes the next', covers(whole) && !covers(neighbor))
    root.dispatchEvent(new PointerEvent('pointerleave', {pointerType:'mouse'}))
    await pause(450)
    check('leaving restores both underlines and removes the fill', covers(whole) && covers(neighbor) && !root.querySelector('[data-note-highlight-hover]'))
    hover(0, 2)
    await pause(250)
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(remainder)
    document.dispatchEvent(new Event('selectionchange'))
    await pause(250)
    check('native selection immediately restores the underline', covers(whole) && !root.querySelector('[data-note-highlight-hover]'))
    selection.removeAllRanges()
    return {passed:checks.length,checks,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}
  } finally {
    window.fetch = originalFetch
    getSelection()?.removeAllRanges()
    if (previousVisibility === null) localStorage.removeItem('gv-note-highlights-visible-v2')
    else localStorage.setItem('gv-note-highlights-visible-v2',previousVisibility)
    window.dispatchEvent(new StorageEvent('storage', {key:'gv-note-highlights-visible-v2'}))
    window.dispatchEvent(new Event('focus'))
  }
})()

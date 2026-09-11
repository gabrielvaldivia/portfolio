// Run with agent-browser eval on /notes/the-new-cost-of-creation.
// Browser-only fixtures intercept every highlight write; no saved data changes.
(async () => {
  const root = document.querySelector('[data-note-highlight-body]')
  if (!root) throw new Error('Open the note first.')
  const originalFetch = window.fetch.bind(window)
  const original = await originalFetch('/api/notes/highlights?noteId=54').then(r => r.json())
  const paragraphs = [...root.querySelectorAll('p')].slice(0, 2)
  const firstText = paragraphs[0].textContent
  const secondText = paragraphs[1].textContent
  const reader = (location, mine = false) => ({ location, mine, createdAt: '2026-09-10T12:00:00.000Z' })
  const first = { id: 'toast-test-first', exact: firstText, start: 0, end: firstText.length, prefix: '', suffix: secondText.slice(0, 64),
    count: 2, mine: true, attributions: [reader('Brooklyn, NY', true), reader('London, United Kingdom')] }
  const second = { id: 'toast-test-second', exact: secondText, start: first.end, end: first.end + secondText.length, prefix: firstText.slice(-64), suffix: '',
    count: 1, mine: false, attributions: [reader('Singapore')] }
  const fixture = { ...original, highlights: [first, second] }
  const writes = []
  let failNext = false
  const checks = []
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  const check = (label, condition) => { if (!condition) throw new Error(label); checks.push(label) }
  const panel = () => document.querySelector('[data-sonner-toast]:not([data-removed="true"]) [aria-label="Highlight attribution"]')
  const text = () => panel()?.textContent || ''
  const button = label => panel()?.querySelector('[aria-label="' + label + '"]')
  const range = index => { const r = document.createRange(); r.selectNodeContents(paragraphs[index]); return r }
  const point = index => { const rect = range(index).getClientRects()[0]; return {clientX: rect.left + 8, clientY: rect.top + rect.height / 2} }
  const hover = index => paragraphs[index].dispatchEvent(new PointerEvent('pointermove', { ...point(index), bubbles: true, pointerType: 'mouse' }))
  const tap = async index => {
    paragraphs[index].dispatchEvent(new PointerEvent('pointerup', { ...point(index), bubbles: true, pointerType: 'touch' }))
    await pause(20)
    paragraphs[index].dispatchEvent(new MouseEvent('click', { ...point(index), bubbles: true }))
  }
  const leave = () => root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
  const visibilityKey = 'gv-note-highlights-visible-v2'
  const previousVisibility = localStorage.getItem(visibilityKey)
  const setVisibility = value => {
    localStorage.setItem(visibilityKey, JSON.stringify(value))
    window.dispatchEvent(new StorageEvent('storage', {key: visibilityKey}))
  }
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    if (url.pathname !== '/api/notes/highlights') return originalFetch(input, init)
    const method = init?.method || (input instanceof Request ? input.method : 'GET')
    if (method !== 'GET') {
      writes.push({ method, body: JSON.parse(init.body) })
      await pause(150)
      if (failNext) { failNext = false; return Response.json({ error: 'Please try again.' }, { status: 503 }) }
      if (method === 'DELETE') fixture.highlights = [{ ...first, count: 1, mine: false, attributions: [reader('London, United Kingdom')] }, second]
    }
    return Response.json(fixture)
  }
  try {
    setVisibility({you: true, them: true})
    window.dispatchEvent(new Event('focus'))
    await pause(600)
    paragraphs[0].scrollIntoView({block: 'center', behavior: 'instant'})
    await pause(200)
    hover(0)
    await pause(300)
    check('hover opens a reader toast with no attribution popover', text().includes('Brooklyn') && !document.querySelector('[data-slot="popover-content"][aria-label="Highlight attribution"]'))
    check('toast is anchored at the bottom right', panel().closest('[data-sonner-toaster]').dataset.xPosition === 'right' && panel().closest('[data-sonner-toaster]').dataset.yPosition === 'bottom')
    check('attribution has no close icon or reserved close-button spacing', !panel().closest('[data-sonner-toast]').querySelector('[data-close-button]') && getComputedStyle(panel()).paddingRight === '0px')
    await pause(8200)
    check('attribution stays visible while the passage remains hovered', Boolean(panel()))
    paragraphs[0].dispatchEvent(new MouseEvent('click', { ...point(0), bubbles: true, detail: 1 }))
    leave()
    await pause(450)
    check('leaving dismisses attribution and restores saved ink, even after a click', !panel() && !root.querySelector('[data-note-highlight-hover]'))
    hover(0)
    await pause(200)
    check('returning to the same highlight reopens attribution', text().includes('Brooklyn'))
    button('Next reader').focus()
    button('Next reader').click()
    await pause(100)
    check('next reader works and hides someone else’s Remove action', text().includes('London') && !button('Remove your highlight'))
    check('keyboard reader controls remain available', document.activeElement === button('Next reader'))
    button('Next reader').click()
    await pause(100)
    check('reader carousel loops back to the owner', text().includes('Brooklyn') && Boolean(button('Remove your highlight')))
    button('Next reader').blur()
    hover(1)
    await pause(150)
    check('another passage replaces the toast', text().includes('Singapore') && document.querySelectorAll('[data-sonner-toast]:not([data-removed="true"]) [aria-label="Highlight attribution"]').length === 1)
    hover(0)
    await pause(150)
    check('returning to a passage resets its reader', text().includes('Brooklyn'))
    window.dispatchEvent(new Event('scroll'))
    await pause(300)
    check('scrolling dismisses hover attribution', !panel())
    hover(0)
    await pause(150)
    failNext = true
    button('Remove your highlight').click()
    await pause(400)
    check('removal failure shows an error and preserves the highlight', [...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('Please try again.')) && fixture.highlights[0].mine)
    button('Remove your highlight').click()
    await pause(500)
    check('successful Remove sends the displayed passage and dismisses attribution', writes.length === 2 && writes.every(write => write.method === 'DELETE' && write.body.anchor.exact === firstText) && !panel())
    await tap(0)
    await pause(200)
    check('touch tapping still exposes the remaining reader', text().includes('London') && !button('Remove your highlight'))
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(range(1))
    document.dispatchEvent(new Event('selectionchange'))
    await pause(550)
    check('selection dismisses attribution and retains the anchored Highlight button', !panel() && Boolean(document.querySelector('[aria-label="Highlight passage"] button')))
    document.querySelector('[aria-label="Highlight passage"] button').click()
    await pause(450)
    check('selection still saves the exact passage', writes.at(-1).method === 'POST' && writes.at(-1).body.anchor.exact === secondText)
    await tap(0)
    await pause(200)
    setVisibility({you: false, them: false})
    await pause(400)
    check('hiding highlights dismisses attribution', !panel())
    await tap(0)
    await pause(150)
    check('hidden passages do not show toasts', !panel())
    setVisibility({you: true, them: true})
    await pause(250)
    await tap(1)
    await pause(150)
    leave()
    await pause(8350)
    check('toast dismisses automatically after eight seconds', !panel())
    return { passed: checks.length, checks, viewport: {width: innerWidth, height: innerHeight}, interceptedWrites: writes.length }
  } finally {
    window.fetch = originalFetch
    if (previousVisibility === null) localStorage.removeItem(visibilityKey)
    else localStorage.setItem(visibilityKey, previousVisibility)
    window.dispatchEvent(new StorageEvent('storage', {key: visibilityKey}))
    window.dispatchEvent(new Event('focus'))
    getSelection()?.removeAllRanges()
  }
})()

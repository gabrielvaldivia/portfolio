// Run on software-is-an-instrument with its saved highlight visible.
// Uses pointer events on real text; does not save or remove any highlights.
(async () => {
  const root = document.querySelector('[data-note-highlight-body]')
  const paragraph = [...root.querySelectorAll('p')].find(p => p.textContent.startsWith('The thing I find so threatening'))
  if (!paragraph) throw new Error('Open software-is-an-instrument first.')
  paragraph.scrollIntoView({ block: 'center', behavior: 'instant' })
  await new Promise(resolve => setTimeout(resolve, 100))
  const range = document.createRange()
  range.setStart(paragraph.firstChild, 0)
  range.setEnd(paragraph.firstChild, 20)
  const rect = range.getClientRects()[0]
  const point = { clientX: rect.left + 5, clientY: rect.top + rect.height / 2 }
  const move = pointerType => root.dispatchEvent(new PointerEvent('pointermove', { ...point, pointerType, bubbles: true }))
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
  const checks = []
  const check = (label, passed) => { if (!passed) throw new Error(label); checks.push(label) }
  const saved = root.querySelectorAll('[data-highlighters-overlay]').length
  const text = root.textContent
  move('mouse')
  await pause(80)
  let layer = root.querySelector('[data-note-highlight-hover]')
  check('hover adds decorative emphasis', Boolean(layer) && layer.getAttribute('aria-hidden') === 'true')
  check('hover paints the full passage', Boolean(layer?.querySelector('[data-highlighters-overlay]')) && !layer?.querySelector('[data-note-highlight-underline]'))
  check('hover opens attribution without a click', Boolean(document.querySelector('[aria-label="Highlight attribution"]')))
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    check('hover brightness eases in', Number(getComputedStyle(layer).opacity) > 0 && Number(getComputedStyle(layer).opacity) < 1)
  }
  await pause(220)
  check('hover reaches full arrival brightness', getComputedStyle(layer).opacity === '1')
  move('mouse')
  check('moving within a passage does not stack marks', root.querySelectorAll('[data-note-highlight-hover]').length === 1)
  root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
  await pause(120)
  await pause(80)
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    check('hover brightness eases out', Number(getComputedStyle(layer).opacity) > 0 && Number(getComputedStyle(layer).opacity) < 1)
  }
  await pause(220)
  check('leaving restores the original highlight', !root.querySelector('[data-note-highlight-hover]') && root.querySelectorAll('[data-highlighters-overlay]').length === saved)
  check('leaving dismisses attribution', !document.querySelector('[aria-label="Highlight attribution"]'))
  move('touch')
  await pause(220)
  check('touch does not create a sticky hover', !root.querySelector('[data-note-highlight-hover]'))
  const selection = getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
  move('mouse')
  await pause(220)
  check('text selection suppresses hover', !root.querySelector('[data-note-highlight-hover]'))
  selection.removeAllRanges()
  check('hover never changes the note text', root.textContent === text)
  return { passed: checks.length, checks }
})()

// Run on a note with its highlights list open, then click a passage. Read
// window.noteHighlightNavigationResult after the scroll and two-second hold.
// Observes the real UI; never creates, updates, or deletes a saved highlight.
(() => {
  window.stopNoteHighlightNavigationCheck?.()
  const root = document.querySelector('[data-note-highlight-body]')
  if (!root) throw new Error('Open a note before running this check.')
  const savedMarks = root.querySelectorAll('[data-highlighters-overlay]').length
  const started = performance.now()
  const scrollPositions = new Set([window.scrollY])
  const timers = []
  const result = { savedMarks, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, checks: [] }
  window.noteHighlightNavigationResult = result
  function check(label, passed) {
    result.checks.push({ label, passed })
  }
  function onScroll() { scrollPositions.add(window.scrollY) }
  const observer = new MutationObserver(() => {
    const overlay = root.querySelector('[data-note-highlight-arrival]')
    if (!overlay) return
    observer.disconnect()
    result.arrivalMs = Math.round(performance.now() - started)
    result.arrivalScrollY = window.scrollY
    result.scrollPositions = scrollPositions.size
    check('arrives with a brighter decorative ink layer', overlay.getAttribute('aria-hidden') === 'true' && getComputedStyle(overlay).opacity === '1')
    check('scroll animates unless reduced motion is requested', result.reducedMotion || scrollPositions.size > 2)
    timers.push(setTimeout(() => {
      check('emphasis remains bright one second after arrival', overlay.isConnected && getComputedStyle(overlay).opacity === '1')
    }, 1000))
    timers.push(setTimeout(() => {
      if (!result.reducedMotion) {
        const opacity = Number(getComputedStyle(overlay).opacity)
        check('emphasis fades after its two-second hold', overlay.isConnected && opacity > 0 && opacity < 1)
      }
    }, 2400))
    timers.push(setTimeout(() => {
      check('temporary emphasis is removed', !overlay.isConnected)
      check('original saved highlights remain unchanged', root.querySelectorAll('[data-highlighters-overlay]').length === savedMarks)
      check('list or mobile sheet closed before navigation', !document.querySelector('[aria-label="Highlighted passages"], [data-bottom-sheet]'))
      result.passed = result.checks.every((entry) => entry.passed)
      window.stopNoteHighlightNavigationCheck()
    }, 3000))
  })
  observer.observe(root, { childList: true, subtree: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  window.stopNoteHighlightNavigationCheck = () => {
    observer.disconnect()
    window.removeEventListener('scroll', onScroll)
    timers.forEach(clearTimeout)
  }
  return 'Ready: click a passage in the highlights list.'
})()

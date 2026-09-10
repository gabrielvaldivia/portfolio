import { createNoteHighlightEmphasis } from './noteHighlightEmphasis'

// Native scrolling handles interruption and browser-specific momentum. Only the
// temporary ink layer animates, leaving the saved highlight and text untouched.
export function navigateToNoteHighlight(root: HTMLElement, range: Range, seed: number, mine: boolean) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const rect = Array.from(range.getClientRects()).find((rect) => rect.width && rect.height) || range.getBoundingClientRect()
  const viewport = window.visualViewport
  const target = Math.max(0, Math.min(
    window.scrollY + rect.top - (viewport?.offsetTop || 0) - (viewport?.height || window.innerHeight) / 3,
    document.documentElement.scrollHeight - window.innerHeight,
  ))
  let disposed = false
  let arrived = false
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  let emphasis: Awaited<ReturnType<typeof createNoteHighlightEmphasis>> | undefined

  function stopWaiting() {
    clearTimeout(settleTimer)
    clearTimeout(fallbackTimer)
    document.removeEventListener('scrollend', arrive)
    window.removeEventListener('scroll', onScroll)
  }

  function cleanup() {
    disposed = true
    stopWaiting()
    clearTimeout(holdTimer)
    emphasis?.remove()
    window.removeEventListener('wheel', cleanup)
    window.removeEventListener('touchstart', cleanup)
    window.removeEventListener('pointerdown', cleanup)
    window.removeEventListener('keydown', cleanup)
  }

  async function arrive() {
    if (disposed || arrived) return
    arrived = true
    stopWaiting()
    try {
      emphasis = await createNoteHighlightEmphasis(root, range, seed, 'arrival', mine)
      if (disposed || !root.isConnected) { cleanup(); return }
      // Start the hold at arrival, not at click time (long notes can scroll far).
      holdTimer = setTimeout(() => {
        emphasis?.fadeOut(0.8, cleanup)
      }, 2000)
    } catch {
      // Navigation still works if the optional emphasis layer cannot load.
      cleanup()
    }
  }

  function onScroll() {
    clearTimeout(settleTimer)
    // Covers browsers without scrollend without reading layout on each frame.
    settleTimer = setTimeout(arrive, 180)
  }

  window.addEventListener('wheel', cleanup, { passive: true })
  window.addEventListener('touchstart', cleanup, { passive: true })
  window.addEventListener('pointerdown', cleanup, { passive: true })
  window.addEventListener('keydown', cleanup)
  if (reducedMotion || Math.abs(window.scrollY - target) < 1) {
    window.scrollTo({ top: target, behavior: 'instant' })
    void arrive()
  } else {
    document.addEventListener('scrollend', arrive)
    window.addEventListener('scroll', onScroll, { passive: true })
    // Also covers an already-clamped viewport or a browser that emits no events.
    fallbackTimer = setTimeout(arrive, 2500)
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
  return cleanup
}

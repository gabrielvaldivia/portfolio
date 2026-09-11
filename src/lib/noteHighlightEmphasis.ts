import { animate } from 'motion/react'

export async function createNoteHighlightEmphasis(root: HTMLElement, range: Range, seed: number, kind: 'arrival' | 'hover', mine: boolean) {
  const { createNoteHighlightMark, suppressNoteHighlightUnderlines } = await import('./noteHighlightMarks')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const overlay = document.createElement('div')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.setAttribute(`data-note-highlight-${kind}`, '')
  overlay.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:${kind === 'hover' && !reducedMotion ? 0 : 1}`
  root.append(overlay)
  const mark = createNoteHighlightMark(overlay, range, seed, kind === 'hover' || mine, true)
  const restoreUnderlines = kind === 'hover' ? suppressNoteHighlightUnderlines(root, range) : undefined
  let animation: ReturnType<typeof animate> | undefined
  let removed = false

  function remove() {
    removed = true
    animation?.stop()
    mark.remove()
    overlay.remove()
    restoreUnderlines?.()
  }

  function show() {
    if (removed) return
    animation?.stop()
    if (reducedMotion) overlay.style.opacity = '1'
    else animation = animate(overlay, { opacity: 1 }, { duration: 0.2, ease: 'easeOut' })
  }

  function fadeOut(duration: number, onComplete = remove) {
    if (removed) return
    animation?.stop()
    if (reducedMotion) onComplete()
    else animation = animate(overlay, { opacity: 0 }, { duration, ease: 'easeOut', onComplete })
  }

  if (kind === 'hover') show()
  return { show, fadeOut, remove }
}

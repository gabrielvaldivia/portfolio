import type { PublicHighlight } from './noteHighlightAnchors'
import { indexHighlightText, rangeFromAnchor } from './noteHighlightDOM'
import { createNoteHighlightEmphasis } from './noteHighlightEmphasis'

export function attachNoteHighlightHover(root: HTMLElement, highlights: PublicHighlight[]) {
  const index = indexHighlightText(root)
  const passages = [...highlights].sort((a, b) => (a.end - a.start) - (b.end - b.start)).flatMap((anchor) => {
    const range = rangeFromAnchor(root, anchor, index)
    return range ? [{ anchor, range }] : []
  })
  let bounds: { passage: typeof passages[number]; rects: DOMRect[] }[] | undefined
  let current: typeof passages[number] | undefined
  let emphasis: Awaited<ReturnType<typeof createNoteHighlightEmphasis>> | undefined
  let request = 0
  let disposed = false

  function clear(immediate = false) {
    request++
    current = undefined
    const previous = emphasis
    if (!previous) return
    if (immediate) { previous.remove(); emphasis = undefined }
    else previous.fadeOut(0.2, () => {
      previous.remove()
      if (emphasis === previous) emphasis = undefined
    })
  }

  function invalidate() {
    bounds = undefined
    clear()
  }

  async function onPointerMove(event: PointerEvent) {
    // Touch selection and drag-to-select must never acquire a sticky hover.
    if (event.pointerType !== 'mouse' || event.buttons || window.getSelection()?.toString() || root.querySelector('[data-note-highlight-arrival]')) {
      if (current) clear()
      return
    }
    // Cache geometry until a scroll/reflow; never remeasure on animation frames.
    bounds ??= passages.map((passage) => ({ passage, rects: Array.from(passage.range.getClientRects()) }))
    const next = bounds.find(({ rects }) => rects.some((rect) => rect.width && rect.height &&
      event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom))?.passage
    if (next === current) return
    if (!next) { clear(); return }
    clear(true)
    current = next
    const requestId = ++request
    try {
      const mark = await createNoteHighlightEmphasis(root, next.range, next.anchor.start, 'hover', next.anchor.mine)
      if (disposed || requestId !== request) { mark.remove(); return }
      emphasis = mark
    } catch {
      // The saved highlight and its attribution remain usable without hover ink.
      if (requestId === request) clear(true)
    }
  }

  const onPointerLeave = () => clear()
  const onSelectionChange = () => { if (window.getSelection()?.toString()) clear(true) }
  const observer = new ResizeObserver(invalidate)
  observer.observe(root)
  root.addEventListener('pointermove', onPointerMove, { passive: true })
  root.addEventListener('pointerleave', onPointerLeave)
  root.addEventListener('pointerdown', onSelectionChange)
  window.addEventListener('scroll', invalidate, { passive: true })
  window.addEventListener('resize', invalidate)
  document.addEventListener('selectionchange', onSelectionChange)
  return () => {
    disposed = true
    clear(true)
    observer.disconnect()
    root.removeEventListener('pointermove', onPointerMove)
    root.removeEventListener('pointerleave', onPointerLeave)
    root.removeEventListener('pointerdown', onSelectionChange)
    window.removeEventListener('scroll', invalidate)
    window.removeEventListener('resize', invalidate)
    document.removeEventListener('selectionchange', onSelectionChange)
  }
}

import type { PublicHighlight } from './noteHighlightAnchors'
import { indexHighlightText, rangeFromAnchor } from './noteHighlightDOM'
import { createNoteHighlightEmphasis } from './noteHighlightEmphasis'

type HoverPassage = { anchor: PublicHighlight; range: Range }
type HoverOptions = {
  onChange: (passage: HoverPassage | null) => void
  getPanel: () => HTMLElement | null
  canHover: () => boolean
}

export function attachNoteHighlightHover(root: HTMLElement, highlights: PublicHighlight[], options: HoverOptions) {
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
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let dismissed: HoverPassage | undefined

  function cancelClose() {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }

  function clear(immediate = false) {
    cancelClose()
    request++
    if (current) options.onChange(null)
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

  function scheduleClose() {
    if (closeTimer || options.getPanel()?.contains(document.activeElement)) return
    // Allow crossing the small gap between the text and the portaled tooltip.
    closeTimer = setTimeout(() => clear(), 120)
  }

  async function onPointerMove(event: PointerEvent) {
    if (event.pointerType === 'mouse' && current && options.getPanel()?.contains(event.target as Node)) {
      cancelClose()
      return
    }
    // Touch selection and drag-to-select must never acquire a sticky hover.
    if (event.pointerType !== 'mouse' || event.buttons || !options.canHover() || window.getSelection()?.toString() || root.querySelector('[data-note-highlight-arrival]')) {
      if (current) clear(true)
      return
    }
    if (!root.contains(event.target as Node)) {
      dismissed = undefined
      if (current) scheduleClose()
      return
    }
    // Cache geometry until a scroll/reflow; never remeasure on animation frames.
    bounds ??= passages.map((passage) => ({ passage, rects: Array.from(passage.range.getClientRects()) }))
    const next = bounds.find(({ rects }) => rects.some((rect) => rect.width && rect.height &&
      event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom + 2))?.passage
    if (next !== dismissed) dismissed = undefined
    if (next === current && next) { cancelClose(); return }
    if (!next || next === dismissed) { scheduleClose(); return }
    clear(true)
    current = next
    options.onChange(next)
    const requestId = ++request
    try {
      const mark = await createNoteHighlightEmphasis(root, next.range, next.anchor.start, 'hover', next.anchor.mine)
      if (disposed || requestId !== request) { mark.remove(); return }
      emphasis = mark
    } catch {
      // Attribution remains usable if the optional hover ink cannot load.
    }
  }

  const onSelectionChange = () => { if (window.getSelection()?.toString()) clear(true) }
  const onFocusIn = (event: FocusEvent) => { if (options.getPanel()?.contains(event.target as Node)) cancelClose() }
  const onFocusOut = (event: FocusEvent) => {
    if (options.getPanel()?.contains(event.target as Node) && !options.getPanel()?.contains(event.relatedTarget as Node)) scheduleClose()
  }
  const onBlur = () => clear(true)
  const observer = new ResizeObserver(invalidate)
  observer.observe(root)
  document.addEventListener('pointermove', onPointerMove, { passive: true })
  root.addEventListener('pointerleave', scheduleClose)
  document.addEventListener('pointerleave', scheduleClose)
  root.addEventListener('pointerdown', onSelectionChange)
  window.addEventListener('scroll', invalidate, { passive: true })
  window.addEventListener('resize', invalidate)
  window.addEventListener('blur', onBlur)
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  function destroy() {
    disposed = true
    clear(true)
    observer.disconnect()
    document.removeEventListener('pointermove', onPointerMove)
    root.removeEventListener('pointerleave', scheduleClose)
    document.removeEventListener('pointerleave', scheduleClose)
    root.removeEventListener('pointerdown', onSelectionChange)
    window.removeEventListener('scroll', invalidate)
    window.removeEventListener('resize', invalidate)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('selectionchange', onSelectionChange)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
  }
  return { destroy, dismiss() { dismissed = current; clear(true) } }
}

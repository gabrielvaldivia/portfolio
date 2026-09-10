import { createReflowObserver, highlight, rangesToLineRects } from '@highlighters/core'
import type { PublicHighlight } from './noteHighlightAnchors'

type HighlightSpan = { start: number; end: number; mine: boolean }

/** Merge each reader style, giving your filled highlights priority at overlaps. */
export function getNoteHighlightSpans(highlights: PublicHighlight[]): HighlightSpan[] {
  function merge(mine: boolean) {
    const spans: HighlightSpan[] = []
    for (const mark of highlights.filter((mark) => mark.mine === mine).sort((a, b) => a.start - b.start)) {
      const previous = spans.at(-1)
      if (previous && mark.start <= previous.end) previous.end = Math.max(previous.end, mark.end)
      else spans.push({ start: mark.start, end: mark.end, mine })
    }
    return spans
  }

  const own = merge(true)
  const others = merge(false).flatMap((span) => {
    const uncovered: HighlightSpan[] = []
    let start = span.start
    for (const mine of own) {
      if (mine.end <= start) continue
      if (mine.start >= span.end) break
      if (mine.start > start) uncovered.push({ start, end: mine.start, mine: false })
      start = Math.max(start, mine.end)
      if (start >= span.end) break
    }
    if (start < span.end) uncovered.push({ start, end: span.end, mine: false })
    return uncovered
  })
  return [...own, ...others].sort((a, b) => a.start - b.start)
}

export function createNoteHighlightMark(root: HTMLElement, range: Range, seed: number, mine: boolean, emphasis = false) {
  if (mine) return highlight(range, {
    color: '#d8b64c', opacity: emphasis ? 0.4 : 0.24, vivid: true, snap: 'none',
    animation: { draw: false }, seed,
  }, root)

  // A separate overlay preserves the original text nodes, links, and selection.
  const overlay = document.createElement('div')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.setAttribute('data-note-highlight-underline', '')
  overlay.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:${emphasis ? 1 : 0.8}`
  root.append(overlay)

  function draw() {
    const origin = overlay.getBoundingClientRect()
    const lines = rangesToLineRects([range]).map((rect) => {
      const line = document.createElement('div')
      line.style.cssText = `position:absolute;left:${rect.left - origin.left}px;top:${rect.top + rect.height - origin.top}px;width:${rect.width}px;border-bottom:2px dotted #d8b64c`
      return line
    })
    overlay.replaceChildren(...lines)
  }

  draw()
  const disconnect = createReflowObserver([root, range.startContainer.parentElement || root, range.endContainer.parentElement || root], draw)
  return { remove() { disconnect(); overlay.remove() } }
}

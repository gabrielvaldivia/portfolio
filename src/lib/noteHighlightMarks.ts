import { createReflowObserver, highlight, rangesToLineRects } from '@highlighters/core'
import type { PublicHighlight } from './noteHighlightAnchors'
import { defaultHighlightVisibility, hasOtherHighlighters, type HighlightVisibility } from './noteHighlightVisibility'

type HighlightSpan = { start: number; end: number; mine: boolean }
type UnderlineState = { exclusions: Map<symbol, Range>; redraw: Set<() => void> }
const underlineStates = new WeakMap<HTMLElement, UnderlineState>()

function getUnderlineState(root: HTMLElement) {
  let state = underlineStates.get(root)
  if (!state) {
    state = { exclusions: new Map(), redraw: new Set() }
    underlineStates.set(root, state)
  }
  return state
}

function subtractRange(range: Range, excluded: Range) {
  const start = range.comparePoint(excluded.startContainer, excluded.startOffset)
  const end = range.comparePoint(excluded.endContainer, excluded.endOffset)
  if (start === 1 || end === -1) return [range]
  const remaining: Range[] = []
  if (start === 0) {
    const before = range.cloneRange()
    before.setEnd(excluded.startContainer, excluded.startOffset)
    if (!before.collapsed) remaining.push(before)
  }
  if (end === 0) {
    const after = range.cloneRange()
    after.setStart(excluded.endContainer, excluded.endOffset)
    if (!after.collapsed) remaining.push(after)
  }
  return remaining
}

/** Temporarily replace only the hovered text's underline, even inside merged marks. */
export function suppressNoteHighlightUnderlines(root: HTMLElement, range: Range) {
  const state = getUnderlineState(root)
  const token = Symbol()
  state.exclusions.set(token, range)
  state.redraw.forEach((draw) => draw())
  return () => {
    if (!state.exclusions.delete(token)) return
    state.redraw.forEach((draw) => draw())
  }
}

/** Merge each reader style, giving your filled highlights priority at overlaps. */
export function getNoteHighlightSpans(highlights: PublicHighlight[], visibility: HighlightVisibility = defaultHighlightVisibility): HighlightSpan[] {
  function merge(mine: boolean) {
    const spans: HighlightSpan[] = []
    for (const mark of highlights.filter((mark) => mine ? mark.mine : hasOtherHighlighters(mark)).sort((a, b) => a.start - b.start)) {
      const previous = spans.at(-1)
      if (previous && mark.start <= previous.end) previous.end = Math.max(previous.end, mark.end)
      else spans.push({ start: mark.start, end: mark.end, mine })
    }
    return spans
  }

  const own = visibility.you ? merge(true) : []
  const others = (visibility.them ? merge(false) : []).flatMap((span) => {
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
  const state = getUnderlineState(root)

  function draw() {
    const origin = overlay.getBoundingClientRect()
    let ranges = [range]
    for (const excluded of state.exclusions.values()) ranges = ranges.flatMap((part) => subtractRange(part, excluded))
    const lines = rangesToLineRects(ranges).map((rect) => {
      const line = document.createElement('div')
      line.style.cssText = `position:absolute;left:${rect.left - origin.left}px;top:${rect.top + rect.height - origin.top}px;width:${rect.width}px;border-bottom:2px dotted #d8b64c`
      return line
    })
    overlay.replaceChildren(...lines)
  }

  draw()
  state.redraw.add(draw)
  const disconnect = createReflowObserver([root, range.startContainer.parentElement || root, range.endContainer.parentElement || root], draw)
  return { remove() { state.redraw.delete(draw); disconnect(); overlay.remove() } }
}

import { getLinkedImage } from './richTextImages'

export const MAX_HIGHLIGHT_LENGTH = 1_000
export const HIGHLIGHT_CONTEXT_LENGTH = 64
const MAX_POSITION = 2_000_000

export type HighlightAnchor = {
  exact: string
  prefix: string
  suffix: string
  start: number
  end: number
}

export type HighlightAttribution = { location: string | null; createdAt: string }

export type PublicHighlight = HighlightAnchor & {
  id: string
  count: number
  mine: boolean
  attributions: HighlightAttribution[]
}

export type HighlightResponse = { highlights: PublicHighlight[]; version: string }

export function normalizeHighlightText(text: string) {
  return text.replace(/\s+/gu, ' ').trim()
}

/** Mirrors rendered text nodes, not innerText: block boundaries and <br> add no text nodes. */
export function getNoteHighlightText(data: unknown): string {
  function visit(value: unknown): string {
    if (!value || typeof value !== 'object') return ''
    const node = value as {
      type?: string; text?: string; root?: unknown; children?: unknown[]
      fields?: { url?: string }
    }
    if (node.root) return visit(node.root)
    if (node.type === 'text') return node.text || ''
    if (node.type === 'upload' || node.type === 'block') return ''
    if (node.type === 'link' && getLinkedImage(node.fields?.url || '', node as Parameters<typeof getLinkedImage>[1])) return ''
    return (node.children || []).map(visit).join('')
  }
  return normalizeHighlightText(visit(data))
}

export function makeHighlightAnchor(text: string, start: number, end: number): HighlightAnchor {
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - HIGHLIGHT_CONTEXT_LENGTH), start),
    suffix: text.slice(end, end + HIGHLIGHT_CONTEXT_LENGTH),
    start,
    end,
  }
}

export function parseHighlightAnchor(value: unknown): HighlightAnchor | null {
  if (!value || typeof value !== 'object') return null
  const anchor = value as HighlightAnchor
  if (
    typeof anchor.exact !== 'string' || anchor.exact.length < 3 || anchor.exact.length > MAX_HIGHLIGHT_LENGTH ||
    normalizeHighlightText(anchor.exact) !== anchor.exact ||
    typeof anchor.prefix !== 'string' || anchor.prefix.length > HIGHLIGHT_CONTEXT_LENGTH ||
    typeof anchor.suffix !== 'string' || anchor.suffix.length > HIGHLIGHT_CONTEXT_LENGTH ||
    !Number.isSafeInteger(anchor.start) || !Number.isSafeInteger(anchor.end) ||
    anchor.start < 0 || anchor.end > MAX_POSITION || anchor.end !== anchor.start + anchor.exact.length
  ) return null
  return { exact: anchor.exact, prefix: anchor.prefix, suffix: anchor.suffix, start: anchor.start, end: anchor.end }
}

/** Reattach by quote + context after edits. Never guess between repeated, ambiguous passages. */
export function resolveHighlightAnchor(text: string, anchor: HighlightAnchor): HighlightAnchor | null {
  const matches: number[] = []
  let offset = text.indexOf(anchor.exact)
  while (offset !== -1) {
    matches.push(offset)
    if (matches.length > 500) return null
    offset = text.indexOf(anchor.exact, offset + 1)
  }
  if (matches.length === 1) return makeHighlightAnchor(text, matches[0], matches[0] + anchor.exact.length)
  if (!matches.length) return null

  const ranked = matches.map((start) => {
    const current = makeHighlightAnchor(text, start, start + anchor.exact.length)
    let score = 0
    for (let i = 1; i <= Math.min(anchor.prefix.length, current.prefix.length); i++) {
      if (anchor.prefix.at(-i) !== current.prefix.at(-i)) break
      score++
    }
    for (let i = 0; i < Math.min(anchor.suffix.length, current.suffix.length); i++) {
      if (anchor.suffix[i] !== current.suffix[i]) break
      score++
    }
    return { current, score }
  }).sort((a, b) => b.score - a.score)
  const best = ranked[0]
  // Position alone is not evidence: a different occurrence can move into the old position.
  if (best.score < Math.min(16, anchor.prefix.length + anchor.suffix.length) || best.score === 0 || best.score === ranked[1]?.score) return null
  return best.current
}

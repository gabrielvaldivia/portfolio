import type { PublicHighlight } from './noteHighlightAnchors'

export type HighlightVisibility = { you: boolean; them: boolean }
export const defaultHighlightVisibility: HighlightVisibility = { you: true, them: true }
export const highlightVisibilityStorageKey = 'gv-note-highlights-visible-v2'
export const legacyHighlightVisibilityStorageKey = 'gv-note-highlights-visible-v1'

export function parseHighlightVisibility(value: string | null, legacy: string | null): HighlightVisibility {
  try {
    const parsed = value ? JSON.parse(value) : null
    if (typeof parsed?.you === 'boolean' && typeof parsed?.them === 'boolean') return { you: parsed.you, them: parsed.them }
  } catch { /* Ignore malformed preferences. */ }
  return { you: legacy !== 'false', them: legacy !== 'false' }
}

export function hasOtherHighlighters(highlight: PublicHighlight) {
  return highlight.count > (highlight.mine ? 1 : 0)
}

export function isHighlightVisible(highlight: PublicHighlight, visibility: HighlightVisibility) {
  return (visibility.you && highlight.mine) || (visibility.them && hasOtherHighlighters(highlight))
}

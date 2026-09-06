export function extractRichText(value: unknown): string {
  if (!value || typeof value !== 'object') return ''

  const visit = (node: unknown): string => {
    if (!node || typeof node !== 'object') return ''
    const record = node as Record<string, unknown>
    const ownText = typeof record.text === 'string' ? record.text : ''
    const children = Array.isArray(record.children) ? record.children.map(visit).join(' ') : ''
    return [ownText, children].filter(Boolean).join(' ')
  }

  return visit(value).replace(/\s+/g, ' ').trim()
}

export function getNoteExcerpt(note: { body?: unknown; excerpt?: string | null }, maxLength = 240) {
  const text = note.excerpt?.trim() || extractRichText(note.body)
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function escapeHTML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

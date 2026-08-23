export type AssistantContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }

const UNORDERED_LIST_ITEM = /^\s*[-*•]\s+(.+)$/
const ORDERED_LIST_ITEM = /^\s*\d+[.)]\s+(.+)$/

export function parseAssistantContent(content: string): AssistantContentBlock[] {
  const cleaned = content.replace(/\{\{FOLLOWUPS:.*?\}\}/g, '').trim()
  if (!cleaned) return [{ type: 'paragraph', text: '' }]

  // Some models collapse a list onto one line. Restore a line break when a
  // sentence is immediately followed by a recognizable list marker.
  const normalized = cleaned
    .replace(/([.!?:;])\s+(?=[-*•]\s+\S)/g, '$1\n')
    .replace(/([.!?:;])\s+(?=\d+[.)]\s+\S)/g, '$1\n')

  const blocks: AssistantContentBlock[] = []
  let paragraphLines: string[] = []
  let listType: 'unordered-list' | 'ordered-list' | null = null
  let listItems: string[] = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
    paragraphLines = []
  }

  const flushList = () => {
    if (!listType || !listItems.length) return
    blocks.push({ type: listType, items: listItems })
    listType = null
    listItems = []
  }

  for (const line of normalized.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const unorderedItem = trimmed.match(UNORDERED_LIST_ITEM)
    if (unorderedItem) {
      flushParagraph()
      if (listType !== 'unordered-list') {
        flushList()
        listType = 'unordered-list'
      }
      listItems.push(unorderedItem[1].trim())
      continue
    }

    const orderedItem = trimmed.match(ORDERED_LIST_ITEM)
    if (orderedItem) {
      flushParagraph()
      if (listType !== 'ordered-list') {
        flushList()
        listType = 'ordered-list'
      }
      listItems.push(orderedItem[1].trim())
      continue
    }

    flushList()
    paragraphLines.push(trimmed)
  }

  flushParagraph()
  flushList()
  return blocks.length ? blocks : [{ type: 'paragraph', text: '' }]
}

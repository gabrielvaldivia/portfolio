import { makeHighlightAnchor, type HighlightAnchor } from './noteHighlightAnchors'

export function indexHighlightText(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const excluded = node.parentElement?.closest('[aria-hidden="true"], script, style')
      // Modal dialogs temporarily hide the article's ancestors from assistive
      // technology. That must not change its text offsets or erase its marks.
      // Only exclude decorative/hidden content inside the article itself.
      return excluded && excluded !== root && root.contains(excluded)
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    },
  })
  const nodes: { node: Text; start: number; end: number }[] = []
  let raw = ''
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    nodes.push({ node, start: raw.length, end: raw.length + node.length })
    raw += node.data
  }
  const starts: number[] = []
  const ends: number[] = []
  let text = ''
  for (let i = 0; i < raw.length; i++) {
    if (/\s/u.test(raw[i])) {
      if (!text.length) continue
      if (text.endsWith(' ')) { ends[ends.length - 1] = i + 1; continue }
      text += ' '
    } else text += raw[i]
    starts.push(i)
    ends.push(i + 1)
  }
  if (text.endsWith(' ')) { text = text.slice(0, -1); starts.pop(); ends.pop() }
  return { text, nodes, starts, ends }
}

export function anchorFromRange(root: HTMLElement, range: Range): HighlightAnchor | null {
  if (range.collapsed || !root.contains(range.startContainer) || !root.contains(range.endContainer)) return null
  const index = indexHighlightText(root)
  const before = document.createRange()
  before.selectNodeContents(root)
  before.setEnd(range.startContainer, range.startOffset)
  const rawStart = before.toString().length
  before.setEnd(range.endContainer, range.endOffset)
  const rawEnd = before.toString().length
  let start = index.ends.findIndex((end) => end > rawStart)
  let end = index.starts.findIndex((start) => start >= rawEnd)
  if (start < 0) return null
  if (end < 0) end = index.text.length
  while (index.text[start] === ' ') start++
  while (index.text[end - 1] === ' ') end--
  return end > start ? makeHighlightAnchor(index.text, start, end) : null
}

export function rangeFromAnchor(root: HTMLElement, anchor: HighlightAnchor, index = indexHighlightText(root)): Range | null {
  if (index.text.slice(anchor.start, anchor.end) !== anchor.exact) return null
  const rawStart = index.starts[anchor.start]
  const rawEnd = index.ends[anchor.end - 1]
  const first = index.nodes.find(({ start, end }) => start <= rawStart && end > rawStart)
  const last = index.nodes.find(({ start, end }) => start < rawEnd && end >= rawEnd)
  if (!first || !last) return null
  const range = document.createRange()
  range.setStart(first.node, rawStart - first.start)
  range.setEnd(last.node, rawEnd - last.start)
  return range
}

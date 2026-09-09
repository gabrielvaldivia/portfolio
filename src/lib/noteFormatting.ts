type RichTextNode = {
  children?: RichTextNode[]
  tag?: string
  text?: string
  type?: string
  [key: string]: unknown
}

export type NoteFormattingChanges = {
  duplicateTitles: number
  headingLevels: number
  strayAsterisks: number
}

type NoteFormattingOptions = {
  title?: string | null
}

const isAlphaNumeric = (value: string | undefined) => (
  Boolean(value && /[\p{L}\p{N}]/u.test(value))
)

function removeStrayAsterisks(value: string) {
  let removed = 0
  let text = ''

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (
      character === '*'
      && !(isAlphaNumeric(value[index - 1]) && isAlphaNumeric(value[index + 1]))
    ) {
      removed += 1
      continue
    }

    text += character
  }

  return {
    removed,
    text: removed > 0 ? text.replace(/ {2,}/g, ' ') : text,
  }
}

const nodeText = (node: RichTextNode): string => {
  if (typeof node.text === 'string') return node.text
  return (node.children || []).map(nodeText).join('')
}

const comparableText = (value: string) => value
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('en-US')

export function normalizeNoteBodyFormatting<T>(body: T, options: NoteFormattingOptions = {}): {
  body: T
  changes: NoteFormattingChanges
} {
  const normalized = structuredClone(body)
  const changes: NoteFormattingChanges = {
    duplicateTitles: 0,
    headingLevels: 0,
    strayAsterisks: 0,
  }

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return

    if (Array.isArray(value)) {
      for (const child of value) visit(child)
      return
    }

    const node = value as RichTextNode

    if (node.type === 'heading' && node.tag !== 'h3') {
      node.tag = 'h3'
      changes.headingLevels += 1
    }

    if (typeof node.text === 'string' && node.text.includes('*')) {
      const result = removeStrayAsterisks(node.text)
      node.text = result.text
      changes.strayAsterisks += result.removed
    }

    if (node.children) visit(node.children)
  }

  const richTextRoot = (
    normalized
    && typeof normalized === 'object'
    && 'root' in normalized
  )
    ? (normalized as { root: unknown }).root
    : normalized

  if (
    options.title
    && richTextRoot
    && typeof richTextRoot === 'object'
    && Array.isArray((richTextRoot as RichTextNode).children)
  ) {
    const children = (richTextRoot as RichTextNode).children!
    const firstContentIndex = children.findIndex((child) => nodeText(child).trim())
    const firstContentNode = children[firstContentIndex]

    if (
      firstContentNode?.type === 'heading'
      && comparableText(nodeText(firstContentNode)) === comparableText(options.title)
    ) {
      children.splice(firstContentIndex, 1)
      changes.duplicateTitles += 1
    }
  }

  visit(richTextRoot)
  return { body: normalized, changes }
}

export function hasNoteFormattingChanges(changes: NoteFormattingChanges) {
  return (
    changes.duplicateTitles > 0
    || changes.headingLevels > 0
    || changes.strayAsterisks > 0
  )
}

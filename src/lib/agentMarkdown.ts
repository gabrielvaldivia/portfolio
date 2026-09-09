import { absoluteSiteUrl } from './structuredData'

type LexicalNode = {
  children?: LexicalNode[]
  fields?: Record<string, unknown>
  format?: number | string
  listType?: string
  relationTo?: string
  tag?: string
  text?: string
  type?: string
  url?: string
  value?: unknown
}

function cleanInlineText(value: string) {
  return value.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n')
}

function markdownLinkUrl(value: string) {
  return value.replace(/\s/g, '%20').replace(/\)/g, '%29')
}

function relationUrl(fields?: Record<string, unknown>) {
  if (!fields) return ''
  if (typeof fields.url === 'string') return fields.url

  const doc = fields.doc as { relationTo?: string; value?: { slug?: string } } | undefined
  const relationTo = typeof fields.relationTo === 'string' ? fields.relationTo : doc?.relationTo
  const value = (doc?.value || fields.value) as { slug?: string } | undefined
  const slug = value?.slug
  if (!slug) return ''
  if (relationTo === 'projects') return `/work/${slug}`
  if (relationTo === 'side-projects') return `/playground/${slug}`
  if (relationTo === 'notes') return `/notes/${slug}`
  return slug === 'home' ? '/' : `/${slug}`
}

function serializeInline(node: LexicalNode): string {
  if (node.type === 'linebreak') return '\n'

  if (node.type === 'text') {
    let value = cleanInlineText(node.text || '')
    const format = typeof node.format === 'number' ? node.format : 0
    const leadingWhitespace = value.match(/^\s*/)?.[0] || ''
    const trailingWhitespace = value.match(/\s*$/)?.[0] || ''
    value = value.slice(leadingWhitespace.length, value.length - trailingWhitespace.length)
    if (!value) return leadingWhitespace
    if (format & 16) value = `\`${value.replace(/`/g, '\\`')}\``
    if (format & 1) value = `**${value}**`
    if (format & 2) value = `*${value}*`
    if (format & 4) value = `~~${value}~~`
    return `${leadingWhitespace}${value}${trailingWhitespace}`
  }

  const content = (node.children || []).map(serializeInline).join('')
  if (node.type === 'link' || node.type === 'autolink') {
    const url = relationUrl(node.fields) || node.url || ''
    return url ? `[${content || url}](${markdownLinkUrl(url)})` : content
  }

  return content
}

function indentListContent(value: string) {
  return value.trim().replace(/\n+/g, '\n  ')
}

function serializeBlock(node: LexicalNode, depth = 0, listIndex = 1): string {
  const children = node.children || []

  if (node.type === 'root') return children.map((child) => serializeBlock(child, depth)).join('')
  if (node.type === 'paragraph') return `${children.map(serializeInline).join('').trim()}\n\n`
  if (node.type === 'heading') {
    const headingLevel = Math.min(6, Math.max(2, Number(String(node.tag || 'h2').replace('h', '')) || 2))
    return `${'#'.repeat(headingLevel)} ${children.map(serializeInline).join('').trim()}\n\n`
  }
  if (node.type === 'quote') {
    const quote = children.map((child) => serializeBlock(child, depth)).join('').trim()
    return `${quote.split('\n').map((line) => `> ${line}`).join('\n')}\n\n`
  }
  if (node.type === 'list') {
    return `${children.map((child, index) => serializeBlock(child, depth + 1, index + 1)).join('')}\n`
  }
  if (node.type === 'listitem') {
    const marker = node.listType === 'number' ? `${listIndex}.` : '-'
    const content = children.map((child) => serializeBlock(child, depth)).join('').trim()
    return `${'  '.repeat(Math.max(0, depth - 1))}${marker} ${indentListContent(content)}\n`
  }
  if (node.type === 'horizontalrule') return '---\n\n'

  const inline = serializeInline(node).trim()
  return inline ? `${inline}\n\n` : children.map((child) => serializeBlock(child, depth)).join('')
}

export function lexicalToMarkdown(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const root = (value as { root?: LexicalNode }).root
  if (!root) return ''
  return serializeBlock(root).replace(/\n{3,}/g, '\n\n').trim()
}

export function lexicalToPlainText(value: unknown) {
  return lexicalToMarkdown(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>-]+\s*/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function entityName(value: unknown) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  if ('name' in value && typeof value.name === 'string') return value.name
  if ('title' in value && typeof value.title === 'string') return value.title
  return ''
}

function mediaDescription(block: Record<string, any>) {
  const media = block.image || block.video
  const alt = entityName(media) || (media && typeof media === 'object' && typeof media.alt === 'string' ? media.alt : '')
  const caption = typeof block.caption === 'string' ? block.caption.trim() : ''
  const label = caption || alt
  if (!label) return ''
  const url = media && typeof media === 'object' && typeof media.url === 'string' ? media.url : ''
  const noun = block.video ? 'Video' : 'Visual'
  return url ? `[${noun}: ${label}](${markdownLinkUrl(url)})` : `${noun}: ${label}`
}

export function contentBlocksToMarkdown(value: unknown) {
  if (!Array.isArray(value)) return ''

  return value.flatMap((block: Record<string, any>) => {
    const title = typeof block.title === 'string' && block.title.trim() ? `## ${block.title.trim()}\n\n` : ''
    const richText = block.content || block.description
    const body = lexicalToMarkdown(richText)
    if (body) return [`${title}${body}`.trim()]

    const media = mediaDescription(block)
    return media ? [media] : []
  }).join('\n\n')
}

export function markdownDocument(title: string, sections: Array<string | null | undefined | false>) {
  return [`# ${title}`, ...sections.filter((section): section is string => (
    typeof section === 'string' && Boolean(section.trim())
  ))]
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .concat('\n')
}

export function markdownResponse(
  markdown: string,
  options: { contentType?: 'text/markdown' | 'text/plain'; htmlPath?: string; maxAge?: number } = {},
) {
  const links = [
    options.htmlPath
      ? `<${absoluteSiteUrl(options.htmlPath)}>; rel="alternate"; type="text/html"`
      : null,
    `<${absoluteSiteUrl('/llms.txt')}>; rel="describedby"`,
  ].filter(Boolean).join(', ')

  return new Response(markdown, {
    headers: {
      'Cache-Control': `public, s-maxage=${options.maxAge ?? 300}, stale-while-revalidate=3600`,
      'Content-Type': `${options.contentType || 'text/markdown'}; charset=utf-8`,
      Link: links,
    },
  })
}

export function markdownListItem(label: string, href: string, description?: string | null) {
  return `- [${label.replace(/[\[\]]/g, '')}](${markdownLinkUrl(href)})${description ? `: ${description.trim()}` : ''}`
}

export { entityName }

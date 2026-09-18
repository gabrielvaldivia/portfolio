import { convertLexicalToHTML, type HTMLConverters } from '@payloadcms/richtext-lexical/html'
import { convertLexicalToPlaintext, type PlaintextConverters } from '@payloadcms/richtext-lexical/plaintext'
import type { SerializedEditorState } from 'lexical'
import { escapeHTML } from './noteContent'
import { getLinkedImage } from './richTextImages'

type EmailMedia = { url?: string | null; alt?: string | null; mimeType?: string | null; filename?: string | null }

function absoluteURL(value: string, siteURL: string, image = false) {
  try {
    const url = new URL(value, `${siteURL}/`)
    const protocols = image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:']
    return protocols.includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function linkURL(fields: Record<string, any>, siteURL: string) {
  if (fields.linkType === 'internal' || fields.doc) {
    const reference = fields.doc
    const slug = reference?.value?.slug || reference?.slug
    if (!slug) return ''
    const collection = reference.relationTo || fields.relationTo
    const path = collection === 'projects' ? `/work/${slug}`
      : collection === 'notes' ? `/notes/${slug}` : slug === 'home' ? '/' : `/${slug}`
    return absoluteURL(path, siteURL)
  }
  return fields.url ? absoluteURL(fields.url, siteURL) : ''
}

function imageHTML(url: string, alt: string) {
  return `<img src="${escapeHTML(url)}" alt="${escapeHTML(alt)}" style="display:block;max-width:100%;height:auto;margin:1em 0;border:0" />`
}

/** Email clients need inline styles and absolute URLs, without the site's layout or controls. */
export function renderNoteEmailContent(body: unknown, siteURL: string) {
  const data = body as SerializedEditorState
  const link: HTMLConverters['link'] = ({ node, nodesToHTML }) => {
    const children = nodesToHTML({ nodes: node.children }).join('')
    const url = linkURL(node.fields, siteURL)
    if (!url) return children
    if (getLinkedImage(url, node)) return imageHTML(url, '')
    return `<a href="${escapeHTML(url)}" style="color:inherit;font-weight:600;text-decoration:underline">${children}</a>`
  }
  const textLink: PlaintextConverters['link'] = ({ node, nodesToPlaintext }) => {
    const text = nodesToPlaintext({ nodes: node.children }).join('')
    const url = linkURL(node.fields, siteURL)
    return url && url !== text ? `${text} (${url})` : text
  }
  const html = convertLexicalToHTML({
    data,
    disableContainer: true,
    converters: ({ defaultConverters }) => ({
      ...defaultConverters,
      paragraph: ({ node, nodesToHTML, providedCSSString }) =>
        `<p style="margin:0 0 1em;${providedCSSString}">${nodesToHTML({ nodes: node.children }).join('') || '<br />'}</p>`,
      heading: ({ node, nodesToHTML, childIndex, providedCSSString }) => {
        const tag = /^h[1-6]$/.test(node.tag) ? node.tag : 'h3'
        return `<${tag} style="margin:${childIndex ? '1em' : '0'} 0 0.5em;font-size:22px;line-height:1.3;font-weight:400;letter-spacing:-0.03em;${providedCSSString}">${nodesToHTML({ nodes: node.children }).join('')}</${tag}>`
      },
      list: ({ node, nodesToHTML }) => {
        const tag = node.tag === 'ol' ? 'ol' : 'ul'
        const start = tag === 'ol' && Number.isSafeInteger(node.start) ? ` start="${node.start}"` : ''
        return `<${tag}${start} style="margin:1em 0;padding-left:1.5em">${nodesToHTML({ nodes: node.children }).join('')}</${tag}>`
      },
      listitem: ({ node, nodesToHTML, parent }) => {
        const check = 'listType' in parent && parent.listType === 'check' ? (node.checked ? '☑ ' : '☐ ') : ''
        return `<li style="margin:0.5em 0${check ? ';list-style:none' : ''}">${check}${nodesToHTML({ nodes: node.children }).join('')}</li>`
      },
      quote: ({ node, nodesToHTML }) =>
        `<blockquote style="margin:1em 0;border-left:2px solid currentColor;padding-left:24px">${nodesToHTML({ nodes: node.children }).join('')}</blockquote>`,
      link,
      autolink: (args) => link({ ...args, node: { ...args.node, type: 'link' } }),
      upload: ({ node }) => {
        if (!node.value || typeof node.value !== 'object') return ''
        const media = node.value as EmailMedia
        const url = absoluteURL(String(media.url || ''), siteURL, true)
        if (!media.url || !url) return ''
        const alt = String(node.fields?.alt || media.alt || '')
        return String(media.mimeType || '').startsWith('image/')
          ? imageHTML(url, alt)
          : `<a href="${escapeHTML(url)}">${escapeHTML(String(media.filename || alt || 'Attachment'))}</a>`
      },
      horizontalrule: () => '<hr style="width:250px;max-width:100%;margin:1em auto;border:0;border-top:1px solid currentColor" />',
    }),
  }).replace(/<strong>/g, '<strong style="font-weight:600">')

  const text = convertLexicalToPlaintext({
    data,
    converters: {
      link: textLink,
      autolink: (args) => textLink({ ...args, node: { ...args.node, type: 'link' } }),
      upload: ({ node }) => {
        if (!node.value || typeof node.value !== 'object') return ''
        const media = node.value as EmailMedia
        if (!media.url) return ''
        const url = absoluteURL(String(media.url), siteURL, true)
        return url ? `\n\n${String(node.fields?.alt || media.alt || media.filename || 'Image')} (${url})\n\n` : ''
      },
    },
  })
  return { html, text }
}

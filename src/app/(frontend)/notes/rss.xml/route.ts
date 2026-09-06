import { getNoteExcerpt } from '@/lib/noteContent'
import { getSiteURL } from '@/lib/noteSubscriptions'
import { getPublishedNotes } from '@/lib/queries'
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from 'lexical'

export const dynamic = 'force-dynamic'

function escapeXML(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cdata(value: string) {
  return `<![CDATA[${value.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

export async function GET() {
  const { docs: notes } = await getPublishedNotes()
  const siteURL = getSiteURL()
  const feedURL = `${siteURL}/notes/rss.xml`
  const lastBuildDate = notes[0]?.publishedAt || notes[0]?.updatedAt || new Date().toISOString()

  const items = notes.map((note) => {
    const url = `${siteURL}/notes/${note.slug}`
    const publishedAt = note.publishedAt || note.createdAt
    let html = ''

    try {
      html = convertLexicalToHTML({
        data: note.body as SerializedEditorState,
        disableContainer: true,
      })
    } catch {
      html = `<p>${escapeXML(getNoteExcerpt(note, 1000))}</p>`
    }

    return `<item>
      <title>${escapeXML(note.title)}</title>
      <link>${escapeXML(url)}</link>
      <guid isPermaLink="true">${escapeXML(url)}</guid>
      <pubDate>${new Date(publishedAt).toUTCString()}</pubDate>
      <description>${cdata(getNoteExcerpt(note))}</description>
      <content:encoded>${cdata(html)}</content:encoded>
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Gabriel Valdivia — Notes</title>
    <link>${escapeXML(`${siteURL}/notes`)}</link>
    <description>Essays and notes by Gabriel Valdivia.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXML(feedURL)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

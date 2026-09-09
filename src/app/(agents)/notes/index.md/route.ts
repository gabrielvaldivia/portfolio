import { markdownDocument, markdownListItem, markdownResponse } from '@/lib/agentMarkdown'
import { getPublishedNotes } from '@/lib/queries'
import { absoluteSiteUrl } from '@/lib/structuredData'

export const revalidate = 300

export async function GET() {
  const { docs: notes } = await getPublishedNotes()
  const noteList = notes.map((note) => {
    const date = note.publishedAt || note.createdAt
    const prefix = date ? new Date(date).toISOString().slice(0, 10) : ''
    const description = [prefix, note.excerpt].filter(Boolean).join(' — ')
    return markdownListItem(
      note.title,
      absoluteSiteUrl(`/notes/${encodeURIComponent(note.slug)}/index.md`),
      description,
    )
  }).join('\n')

  const markdown = markdownDocument('Notes by Gabriel Valdivia', [
    `Canonical page: ${absoluteSiteUrl('/notes')}`,
    noteList,
    `RSS feed: ${absoluteSiteUrl('/notes/rss.xml')}`,
  ])

  return markdownResponse(markdown, { htmlPath: '/notes' })
}

import { lexicalToMarkdown, markdownDocument, markdownResponse } from '@/lib/agentMarkdown'
import { getPublishedNoteBySlug } from '@/lib/queries'
import { absoluteSiteUrl } from '@/lib/structuredData'

export const revalidate = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const note = await getPublishedNoteBySlug(slug)
  if (!note) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

  const canonicalPath = `/notes/${encodeURIComponent(note.slug)}`
  const publishedAt = note.publishedAt || note.createdAt
  const metadata = [
    '- Author: Gabriel Valdivia',
    publishedAt ? `- Published: ${new Date(publishedAt).toISOString()}` : null,
    note.updatedAt ? `- Updated: ${new Date(note.updatedAt).toISOString()}` : null,
  ].filter(Boolean).join('\n')
  const markdown = markdownDocument(note.title, [
    `Canonical page: ${absoluteSiteUrl(canonicalPath)}`,
    metadata,
    note.excerpt ? `> ${note.excerpt}` : null,
    lexicalToMarkdown(note.body),
  ])

  return markdownResponse(markdown, { htmlPath: canonicalPath })
}

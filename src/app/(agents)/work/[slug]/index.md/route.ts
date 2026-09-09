import {
  contentBlocksToMarkdown,
  entityName,
  lexicalToMarkdown,
  markdownDocument,
  markdownResponse,
} from '@/lib/agentMarkdown'
import { getProjectBySlug } from '@/lib/queries'
import { absoluteSiteUrl } from '@/lib/structuredData'

export const revalidate = 300

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

  const team = Array.isArray(project.team)
    ? project.team.map((person) => {
        const name = entityName(person)
        if (!name) return ''
        const role = person && typeof person === 'object' && 'role' in person && typeof person.role === 'string'
          ? person.role
          : ''
        return `- ${name}${role ? ` — ${role}` : ''}`
      }).filter(Boolean).join('\n')
    : ''
  const services = Array.isArray(project.services)
    ? project.services.map(entityName).filter(Boolean).join(', ')
    : ''
  const client = entityName(project.client)
  const description = lexicalToMarkdown(project.description) || project.subtitle || ''
  const content = contentBlocksToMarkdown(project.content)
  const canonicalPath = `/work/${encodeURIComponent(slug)}`

  const markdown = markdownDocument(project.title, [
    `Canonical page: ${absoluteSiteUrl(canonicalPath)}`,
    project.subtitle ? `> ${project.subtitle}` : null,
    [
      project.year ? `- Date: ${project.year}` : null,
      client ? `- Client: ${client}` : null,
      services ? `- Services: ${services}` : null,
    ].filter(Boolean).join('\n'),
    description ? `## Overview\n\n${description}` : null,
    team ? `## Team\n\n${team}` : null,
    content ? `## Case study\n\n${content}` : null,
    '## Attribution\n\nCredits and collaborators are listed as provided on the canonical case study. This page does not claim that Gabriel was the sole creator of the project.',
  ])

  return markdownResponse(markdown, { htmlPath: canonicalPath })
}

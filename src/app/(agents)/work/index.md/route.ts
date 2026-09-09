import { getProjects } from '@/lib/queries'
import { markdownDocument, markdownListItem, markdownResponse } from '@/lib/agentMarkdown'
import { absoluteSiteUrl } from '@/lib/structuredData'

export const revalidate = 300

export async function GET() {
  const { docs: projects } = await getProjects()
  const projectList = projects.flatMap((project) => {
    if (!project.slug) return []
    const description = project.subtitle || undefined
    return [markdownListItem(
      project.title,
      absoluteSiteUrl(`/work/${encodeURIComponent(project.slug)}/index.md`),
      description,
    )]
  }).join('\n')

  const markdown = markdownDocument('Selected work by Gabriel Valdivia', [
    `Canonical page: ${absoluteSiteUrl('/work')}`,
    'These case studies describe product, brand, strategy, and design work. Read the credits and team fields on each project for attribution.',
    projectList,
  ])

  return markdownResponse(markdown, { htmlPath: '/work' })
}

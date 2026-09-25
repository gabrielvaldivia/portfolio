import { getPageBySlug, getSideProjects } from '@/lib/queries'
import { absoluteSiteUrl } from '@/lib/structuredData'
import {
  markdownDocument,
  markdownListItem,
  markdownResponse,
  lexicalToMarkdown,
} from '@/lib/agentMarkdown'

export const revalidate = 3600

function linkedItem(item: Record<string, any>) {
  const label = typeof item.title === 'string' ? item.title : ''
  if (!label) return ''
  const details = [item.duration, item.event, item.year].filter(Boolean).join(' · ')
  return item.url
    ? markdownListItem(label, item.url, details)
    : `- ${label}${details ? ` — ${details}` : ''}`
}

export async function GET() {
  const [page, sideProjectsResult] = await Promise.all([
    getPageBySlug('about'),
    getSideProjects(),
  ])
  const sections = ((page as any)?.aboutSections || []) as Array<Record<string, any>>
  const generatedSections = sections.flatMap((section) => {
    const heading = typeof section.title === 'string' && section.title.trim()
      ? section.title.trim()
      : ''

    if (section.blockType === 'aboutBioSection') {
      const bio = lexicalToMarkdown(section.bio)
      return bio ? [`## ${heading || 'Bio'}\n\n${bio}`] : []
    }

    if (section.blockType === 'aboutTalksSection' || section.blockType === 'aboutInterviewsSection') {
      const items = section.blockType === 'aboutTalksSection' ? section.talks : section.interviews
      const list = Array.isArray(items) ? items.map(linkedItem).filter(Boolean).join('\n') : ''
      return list ? [`## ${heading || (section.blockType === 'aboutTalksSection' ? 'Talks' : 'Interviews')}\n\n${list}`] : []
    }

    if (section.blockType === 'aboutPatentsSection') {
      const list = Array.isArray(section.patents)
        ? section.patents.map((patent: Record<string, any>) => (
            patent.url
              ? markdownListItem(patent.title, patent.url, patent.patentId)
              : `- ${patent.title}${patent.patentId ? ` — ${patent.patentId}` : ''}`
          )).join('\n')
        : ''
      return list ? [`## ${heading || 'Patents'}\n\n${list}`] : []
    }

    return []
  })

  const playgroundSection = sections.find((section) => section.blockType === 'aboutPlaygroundSection')
  const playgroundLimit = typeof playgroundSection?.itemLimit === 'number' && playgroundSection.itemLimit > 0
    ? playgroundSection.itemLimit
    : 5
  const playground = (playgroundSection ? sideProjectsResult.docs.slice(0, playgroundLimit) : []).flatMap((project) => (
    project.slug
      ? [markdownListItem(project.title, absoluteSiteUrl(`/playground/${project.slug}`), project.description)]
      : []
  )).join('\n')

  const markdown = markdownDocument('About Gabriel Valdivia', [
    `Canonical page: ${absoluteSiteUrl('/about')}`,
    ...generatedSections,
    playground ? `## Selected playground projects\n\n${playground}` : null,
    '## Contact\n\n- Email: [gabe@valdivia.works](mailto:gabe@valdivia.works)',
  ])

  return markdownResponse(markdown, { htmlPath: '/about' })
}

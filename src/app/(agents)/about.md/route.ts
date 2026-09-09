import { getPageBySlug, getSideProjects } from '@/lib/queries'
import { absoluteSiteUrl } from '@/lib/structuredData'
import {
  markdownDocument,
  markdownListItem,
  markdownResponse,
} from '@/lib/agentMarkdown'

export const revalidate = 300

const BIOGRAPHY = [
  'I’ve spent 15 years designing for some of the world’s top tech companies while building products of my own. From Automatic to Meta, Google, CNN, and Patreon, I’ve worked across product, brand, and emerging technology, helping teams turn ambitious ideas into products people use.',
  'Today, I bring that experience to early-stage teams building their first generation of products. I work fractionally with companies like Daylight Computer, Workmate, Slingshot AI, and Google Ventures, helping founders avoid attractive wrong turns, make better decisions, and move quickly from idea to product.',
]

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

    if (section.blockType === 'aboutBioSection') return []

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
  const playground = sideProjectsResult.docs.slice(0, playgroundLimit).flatMap((project) => (
    project.slug
      ? [markdownListItem(project.title, absoluteSiteUrl(`/playground/${project.slug}`), project.description)]
      : []
  )).join('\n')

  const markdown = markdownDocument('About Gabriel Valdivia', [
    `Canonical page: ${absoluteSiteUrl('/about')}`,
    `## Bio\n\n${BIOGRAPHY.join('\n\n')}`,
    ...generatedSections,
    playground ? `## Selected playground projects\n\n${playground}` : null,
    '## Contact\n\n- Email: [gabe@valdivia.works](mailto:gabe@valdivia.works)',
  ])

  return markdownResponse(markdown, { htmlPath: '/about' })
}

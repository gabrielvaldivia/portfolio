import { markdownDocument, markdownListItem, markdownResponse } from '@/lib/agentMarkdown'
import { SITE_TAGLINE } from '@/lib/siteMetadata'
import { absoluteSiteUrl } from '@/lib/structuredData'

export const revalidate = 300

export function GET() {
  const markdown = markdownDocument('Gabriel Valdivia', [
    `> ${SITE_TAGLINE}`,
    'Gabriel Valdivia is a product designer who works with early-stage teams on first-generation products. This file is a curated guide to the public, canonical material on this website.',
    [
      '## Start here',
      markdownListItem('About Gabriel', absoluteSiteUrl('/about.md'), 'Biography, experience, talks, interviews, patents, and selected experiments.'),
      markdownListItem('Selected work', absoluteSiteUrl('/work/index.md'), 'Case studies with project context, collaborators, services, dates, and visual descriptions.'),
      markdownListItem('Notes', absoluteSiteUrl('/notes/index.md'), 'Essays by Gabriel, including publication dates and full-text Markdown versions.'),
      markdownListItem('Engagement models', absoluteSiteUrl('/engagement-models'), 'Current ways to work with Gabriel.'),
    ].join('\n'),
    [
      '## Feeds',
      markdownListItem('Notes RSS feed', absoluteSiteUrl('/notes/rss.xml')),
      markdownListItem('Photos JSON feed', absoluteSiteUrl('/photos/feed.json')),
      markdownListItem('Sitemap', absoluteSiteUrl('/sitemap.xml')),
    ].join('\n'),
    [
      '## Contact',
      '- Email: [gabe@valdivia.works](mailto:gabe@valdivia.works)',
      `- Website: ${absoluteSiteUrl('/')}`,
    ].join('\n'),
    '## Interpretation\n\nProject credits and collaborators should be read exactly as stated on each case study. A project appearing in this portfolio does not imply that Gabriel was its sole designer or creator.',
  ])

  return markdownResponse(markdown, { contentType: 'text/plain', htmlPath: '/' })
}

// Store the timeline's generated links as native Lexical link nodes so they are
// visible and editable in Payload's rich-text editor.
// Usage:
//   npx payload run scripts/backfill-timeline-links.ts -- --dry-run
//   npx payload run scripts/backfill-timeline-links.ts
import config from '@payload-config'
import { getPayload } from 'payload'

import {
  enrichTimelineRichText,
  type TimelineRichText,
} from '../src/data/timelineContent'

const isDryRun = process.argv.includes('--dry-run')
const payload = await getPayload({ config })
const timeline = await payload.findGlobal({
  slug: 'timeline',
  depth: 0,
})

if (!Array.isArray(timeline.chapters)) {
  throw new Error('Timeline chapters are unavailable.')
}

const countLinks = (content: TimelineRichText): number => {
  let count = 0

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return

    const candidate = node as Record<string, unknown>
    if (candidate.type === 'link') count += 1

    if (Array.isArray(candidate.children)) {
      candidate.children.forEach(visit)
    }
  }

  visit(content.root)
  return count
}

let linksBefore = 0
let linksAfter = 0
let chaptersChanged = 0

const chapters = timeline.chapters.map((chapter) => {
  const content = chapter.content as TimelineRichText
  const enrichedContent = enrichTimelineRichText(content)

  linksBefore += countLinks(content)
  linksAfter += countLinks(enrichedContent)
  if (JSON.stringify(enrichedContent) !== JSON.stringify(content)) chaptersChanged += 1

  return {
    ...chapter,
    content: enrichedContent,
  }
})

if (!isDryRun && chaptersChanged > 0) {
  await payload.updateGlobal({
    slug: 'timeline',
    data: { chapters } as never,
    depth: 0,
  })
}

console.log(JSON.stringify({
  chapters: chapters.length,
  chaptersChanged,
  dryRun: isDryRun,
  linksAfter,
  linksBefore,
}, null, 2))

process.exit(0)

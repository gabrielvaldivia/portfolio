import type { Metadata } from 'next'
import { TimelineExperience } from '@/components/TimelineExperience'
import {
  DEFAULT_TIMELINE_CHAPTERS,
  normalizeTimelineChapters,
} from '@/data/timelineContent'
import { getPayload } from '@/lib/payload'

const title = 'Timeline — Gabriel Valdivia'
const description = 'An interactive timeline from March 23, 1987 to today.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: [],
  },
}

export const revalidate = 60

export default async function TimelinePage() {
  let chapters = normalizeTimelineChapters(undefined, DEFAULT_TIMELINE_CHAPTERS)

  try {
    const payload = await getPayload()
    const timeline = await payload.findGlobal({
      slug: 'timeline',
      depth: 0,
    })
    chapters = normalizeTimelineChapters(timeline?.chapters, DEFAULT_TIMELINE_CHAPTERS)
  } catch (error) {
    console.error('Timeline CMS content unavailable; serving the bundled copy.', error)
  }

  return <TimelineExperience chapters={chapters} />
}

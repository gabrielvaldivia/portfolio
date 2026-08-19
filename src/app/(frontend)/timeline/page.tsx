import type { Metadata } from 'next'
import { TimelineExperience } from '@/components/TimelineExperience'

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

export default function TimelinePage() {
  return <TimelineExperience />
}

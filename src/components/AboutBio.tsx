import Link from 'next/link'
import { ABOUT_BIO_PARAGRAPHS } from '@/lib/aboutBio'

export function AboutBio({ linkTimeline = false }: { linkTimeline?: boolean }) {
  const [beforeTimeline, afterTimeline] = ABOUT_BIO_PARAGRAPHS[0].split('two decades')

  return (
    <div className="rich-text text-pretty text-body-large">
      {linkTimeline && afterTimeline !== undefined ? (
        <p>{beforeTimeline}<Link href="/timeline">two decades</Link>{afterTimeline}</p>
      ) : <p>{ABOUT_BIO_PARAGRAPHS[0]}</p>}
      <p>{ABOUT_BIO_PARAGRAPHS[1]}</p>
    </div>
  )
}

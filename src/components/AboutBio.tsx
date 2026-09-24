import { ABOUT_BIO_PARAGRAPHS } from '@/lib/aboutBio'

export function AboutBio() {
  return (
    <div className="rich-text text-pretty text-body-large">
      {ABOUT_BIO_PARAGRAPHS.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </div>
  )
}

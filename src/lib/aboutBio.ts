export const ABOUT_BIO_HEADING = 'I help founders avoid attractive wrong turns and move quickly from idea to product.'

export const ABOUT_BIO_PARAGRAPHS = [
  'I bring two decades of experience designing and building products for the world’s top tech companies to help early-stage teams get off the ground. I’ve worked across product, brand, and emerging technology, helping teams turn ambitious ideas into products people love.',
  'As a fractional design partner, I help shape the core experience, build prototypes, and bring the product and brand into focus. From early explorations through launch, I help teams decide what matters most, test their assumptions, and bring a clear point of view to the details of what they ship.',
] as const

type Portrait = ResponsiveImageMedia & { url: string }

function isPortrait(value: unknown): value is Portrait {
  return typeof value === 'object' && value !== null && 'url' in value
    && typeof value.url === 'string' && Boolean(value.url)
}

/** Home owns the portraits shared by its About preview and the full About page. */
export function getAboutPortraits(section?: { image?: unknown; imageDark?: unknown }) {
  const image: Portrait = isPortrait(section?.image) ? section.image : {
    url: '/images/about-portrait.jpg',
    alt: 'Portrait of Gabriel Valdivia',
    width: 1118,
    height: 1342,
  }
  const darkImage: Portrait = isPortrait(section?.imageDark) ? section.imageDark : image
  return { image, darkImage }
}
import type { ResponsiveImageMedia } from './responsiveImage'

import type { Metadata } from 'next'
import { lexicalToPlainText } from './agentMarkdown'

const SITE_NAME = 'Gabriel Valdivia'
const OG_WIDTH = 1200
const OG_HEIGHT = 630
const DESCRIPTION_LIMIT = 200

type MediaSize = { url?: string | null; width?: number | null; height?: number | null }

type ProjectMedia = MediaSize & {
  mimeType?: string | null
  sizes?: Record<string, MediaSize | null | undefined> | null
}

export type ProjectShareImage = { url: string; width?: number; height?: number }

function asMedia(value: unknown): ProjectMedia | undefined {
  if (!value || typeof value !== 'object') return undefined
  const media = value as ProjectMedia
  if (!media.url) return undefined
  // Share cards can't show videos, and most crawlers ignore SVGs.
  if (media.mimeType && (!media.mimeType.startsWith('image/') || media.mimeType === 'image/svg+xml')) return undefined
  return media
}

/** Prefer Payload's 1200×630 `og` crop, which only exists when the upload is large enough. */
function toShareImage(media: ProjectMedia): ProjectShareImage {
  const og = media.sizes?.og
  if (og?.url) return { url: og.url, width: og.width || OG_WIDTH, height: og.height || OG_HEIGHT }
  return {
    url: media.url!,
    ...(media.width ? { width: media.width } : {}),
    ...(media.height ? { height: media.height } : {}),
  }
}

/** The first image in a project's content blocks — usually its hero. */
export function firstContentImage(content: unknown): ProjectShareImage | undefined {
  if (!Array.isArray(content)) return undefined
  for (const block of content) {
    const media = asMedia((block as { image?: unknown } | null)?.image)
    if (media) return toShareImage(media)
  }
  return undefined
}

type ProjectLike = {
  title?: string | null
  subtitle?: string | null
  description?: unknown
  featuredImage?: unknown
  content?: unknown
  meta?: { title?: string | null; description?: string | null; image?: unknown } | null
}

/** An explicit SEO image wins, then the hero, then the grid thumbnail. */
export function projectShareImage(doc: object): ProjectShareImage | undefined {
  const project = doc as ProjectLike
  const metaImage = asMedia(project.meta?.image)
  if (metaImage) return toShareImage(metaImage)
  const hero = firstContentImage(project.content)
  if (hero) return hero
  const featured = asMedia(project.featuredImage)
  return featured ? toShareImage(featured) : undefined
}

function truncate(text: string, limit: number) {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.—-]+$/, '')}…`
}

export function projectDescription(doc: object) {
  const project = doc as ProjectLike
  const explicit = project.meta?.description || project.subtitle
  if (explicit) return explicit
  const text = typeof project.description === 'string'
    ? project.description
    : lexicalToPlainText(project.description)
  return truncate(text, DESCRIPTION_LIMIT)
}

export function buildProjectMetadata(
  doc: object,
  { canonicalPath, markdownPath }: { canonicalPath: string; markdownPath?: string },
): Metadata {
  const project = doc as ProjectLike
  const name = project.meta?.title || project.title || ''
  const title = `${name} — ${SITE_NAME}`
  const description = projectDescription(project)
  const image = projectShareImage(project)
  const alt = project.title || name

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      ...(markdownPath ? { types: { 'text/markdown': markdownPath } } : {}),
    },
    openGraph: {
      type: 'article',
      title: name,
      description,
      url: canonicalPath,
      ...(image ? { images: [{ ...image, alt }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description,
      ...(image ? { images: [{ url: image.url, alt }] } : {}),
    },
  }
}

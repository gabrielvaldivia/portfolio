import type { Metadata } from 'next'

const SITE_NAME = 'Gabriel Valdivia'

type MetaImage = {
  url?: string | null
  width?: number | null
  height?: number | null
  alt?: string | null
}

export type PageLike = {
  title?: string | null
  meta?: {
    title?: string | null
    description?: string | null
    image?: number | string | MetaImage | null
  } | null
}

type BuildPageMetadataOptions = {
  fallbackTitle: string
  fallbackDescription?: string
  appendSiteName?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function getPageMeta(page: unknown): Record<string, unknown> | undefined {
  if (!isRecord(page) || !isRecord(page.meta)) return undefined
  return page.meta
}

function resolveMetaImage(image: unknown): MetaImage | undefined {
  if (!image || typeof image !== 'object') return undefined

  const media = image as MetaImage
  return media.url ? media : undefined
}

export function buildPageMetadata(
  page: unknown,
  {
    fallbackTitle,
    fallbackDescription = '',
    appendSiteName = true,
  }: BuildPageMetadataOptions,
): Metadata {
  const meta = getPageMeta(page)
  const titleText = getString(meta?.title) || fallbackTitle
  const title = appendSiteName ? `${titleText} — ${SITE_NAME}` : titleText
  const description = getString(meta?.description) || fallbackDescription
  const image = resolveMetaImage(meta?.image)

  const openGraphImage = image?.url
    ? {
        url: image.url,
        ...(image.width ? { width: image.width } : {}),
        ...(image.height ? { height: image.height } : {}),
        ...(image.alt ? { alt: image.alt } : {}),
      }
    : undefined

  return {
    title,
    description,
    ...(openGraphImage
      ? {
          openGraph: {
            title,
            description,
            images: [openGraphImage],
          },
          twitter: {
            card: 'summary_large_image' as const,
            title,
            description,
            images: [openGraphImage.url],
          },
        }
      : {}),
  }
}

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

function resolveMetaImage(image: unknown): MetaImage | undefined {
  if (!image || typeof image !== 'object') return undefined

  const media = image as MetaImage
  return media.url ? media : undefined
}

export function buildPageMetadata(
  page: PageLike | null | undefined,
  {
    fallbackTitle,
    fallbackDescription = '',
    appendSiteName = true,
  }: BuildPageMetadataOptions,
): Metadata {
  const titleText = page?.meta?.title || fallbackTitle
  const title = appendSiteName ? `${titleText} — ${SITE_NAME}` : titleText
  const description = page?.meta?.description || fallbackDescription
  const image = resolveMetaImage(page?.meta?.image)

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

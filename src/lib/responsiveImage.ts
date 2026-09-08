type ResponsiveImageVariant = {
  url?: string | null
  width?: number | null
  height?: number | null
  mimeType?: string | null
}

export type ResponsiveImageMedia = ResponsiveImageVariant & {
  alt?: string | null
  sizes?: {
    thumbnail?: ResponsiveImageVariant | null
    small?: ResponsiveImageVariant | null
    medium?: ResponsiveImageVariant | null
    large?: ResponsiveImageVariant | null
    xlarge?: ResponsiveImageVariant | null
  } | null
}

export type ResponsiveImageCandidate = {
  url: string
  width: number
}

const payloadImageSizeWidths = {
  thumbnail: 300,
  small: 600,
  medium: 900,
  large: 1400,
  xlarge: 1920,
} as const

function getCandidate(
  variant: ResponsiveImageVariant | null | undefined,
  fallbackWidth?: number,
): ResponsiveImageCandidate | null {
  const url = typeof variant?.url === 'string' ? variant.url.trim() : ''
  const width = Number(variant?.width) || fallbackWidth || 0

  return url && width > 0 ? { url, width } : null
}

export function getResponsiveImageCandidates(
  media: ResponsiveImageMedia | null | undefined,
): ResponsiveImageCandidate[] {
  if (!media?.url) return []

  const candidates = Object.entries(payloadImageSizeWidths).flatMap(([name, width]) => {
    const candidate = getCandidate(
      media.sizes?.[name as keyof NonNullable<ResponsiveImageMedia['sizes']>],
      width,
    )
    return candidate ? [candidate] : []
  })
  const original = getCandidate(media)
  if (original) candidates.push(original)

  const byUrl = new Map<string, ResponsiveImageCandidate>()
  candidates.forEach((candidate) => {
    const current = byUrl.get(candidate.url)
    if (!current || candidate.width < current.width) byUrl.set(candidate.url, candidate)
  })

  const byWidth = new Map<number, ResponsiveImageCandidate>()
  Array.from(byUrl.values())
    .sort((first, second) => first.width - second.width)
    .forEach((candidate) => {
      if (!byWidth.has(candidate.width)) byWidth.set(candidate.width, candidate)
    })

  return Array.from(byWidth.values()).sort((first, second) => first.width - second.width)
}

export function getResponsiveImageSrcSet(
  media: ResponsiveImageMedia | null | undefined,
): string | undefined {
  const candidates = getResponsiveImageCandidates(media)
  return candidates.length > 1
    ? candidates.map(({ url, width }) => `${url} ${width}w`).join(', ')
    : undefined
}

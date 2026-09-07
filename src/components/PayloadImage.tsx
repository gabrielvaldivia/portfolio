import Image, { type ImageProps } from 'next/image'
import {
  getResponsiveImageSrcSet,
  type ResponsiveImageMedia,
} from '@/lib/responsiveImage'

type PayloadImageProps = Omit<ImageProps, 'alt' | 'src' | 'unoptimized'> & {
  alt?: string
  media: ResponsiveImageMedia
}

/**
 * Uses Payload's pre-generated R2 image sizes without invoking Vercel's image
 * optimizer. Older media without sizes falls back to the original URL.
 */
export function PayloadImage({
  alt,
  media,
  loading,
  preload,
  priority,
  sizes,
  ...props
}: PayloadImageProps) {
  const src = media.url || ''
  const srcSet = getResponsiveImageSrcSet(media)
  const shouldLoadEagerly = Boolean(preload || priority)
  const image = (
    <Image
      {...props}
      alt={alt ?? media.alt ?? ''}
      fetchPriority={shouldLoadEagerly ? 'high' : props.fetchPriority}
      loading={shouldLoadEagerly && srcSet ? 'eager' : loading}
      preload={srcSet ? undefined : preload}
      priority={srcSet ? undefined : priority}
      sizes={sizes}
      src={src}
      unoptimized
    />
  )

  if (!srcSet) return image

  return (
    <picture
      style={props.fill
        ? { display: 'block', inset: 0, position: 'absolute' }
        : { display: 'contents' }}
    >
      <source sizes={sizes} srcSet={srcSet} />
      {image}
    </picture>
  )
}

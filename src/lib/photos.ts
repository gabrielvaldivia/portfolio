import { cache } from 'react'
import { getPayload } from './payload'

export const SITE_URL = 'https://gabrielvaldivia.com'
export const PHOTO_FEED_URL = `${SITE_URL}/photo/feed.json`

export type PhotoExif = {
  camera?: string
  lens?: string
  shutter?: string
  aperture?: string
  iso?: string
  focal?: string
}

export type Photo = {
  slug: string
  /** Absolute URL of the web rendition (EXIF-stripped), from R2 */
  src: string
  width: number
  height: number
  /** RFC 3339, from EXIF capture date (upload time fallback) */
  datePublished: string
  alt: string
  exif: PhotoExif
}

export const getPhotos = cache(async (): Promise<Photo[]> => {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'photos',
    limit: 500,
    depth: 0,
    sort: '-captureDate',
  })
  return result.docs
    .map((doc) => {
      const web = doc.sizes?.web
      const src = web?.url || doc.url
      if (!src || !doc.slug) return null

      const width = (web?.url ? web.width : doc.width) ?? 0
      const height = (web?.url ? web.height : doc.height) ?? 0
      const exif: PhotoExif = Object.fromEntries(
        Object.entries(doc.exif ?? {}).filter(([, value]) => value != null && value !== ''),
      )

      return {
        slug: doc.slug,
        src,
        width,
        height,
        datePublished: new Date(doc.captureDate || doc.createdAt)
          .toISOString()
          .replace(/\.\d{3}Z$/, 'Z'),
        alt: doc.alt ?? '',
        exif,
      }
    })
    .filter((photo): photo is Photo => photo !== null)
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished))
})

export async function getPhotoBySlug(slug: string): Promise<Photo | undefined> {
  const photos = await getPhotos()
  return photos.find((p) => p.slug === slug)
}

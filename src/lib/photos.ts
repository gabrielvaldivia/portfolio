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
  /** Absolute URL of the original image in R2 */
  src: string
  width: number
  height: number
  /** RFC 3339, from EXIF capture date (upload time fallback) */
  datePublished: string
  alt: string
  exif: PhotoExif
}

const FALLBACK_PHOTOS: Photo[] = [
  {
    slug: 'dscf0017',
    src: 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/photos/DSCF0017-2000x1333.jpg',
    width: 2000,
    height: 1333,
    datePublished: '2026-07-16T00:00:00Z',
    alt: 'A kendama and game controller on a desk',
    exif: {
      camera: 'Fujifilm X100VI',
      focal: '23mm',
      aperture: 'ƒ/2',
      shutter: '1/40',
      iso: '500',
    },
  },
]

export const getPhotos = cache(async (): Promise<Photo[]> => {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'photos',
    limit: 500,
    depth: 0,
    sort: '-captureDate',
  })
  const photos = result.docs
    .map((doc) => {
      const src = doc.url
      if (!src || !doc.slug) return null

      const width = doc.width ?? 0
      const height = doc.height ?? 0
      const exif: PhotoExif = Object.fromEntries(
        Object.entries(doc.exif ?? {}).filter(([, value]) => value != null && value !== ''),
      )
      if (exif.aperture) exif.aperture = exif.aperture.replace(/^f\//i, 'ƒ/')

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

  return photos.length > 0 ? photos : FALLBACK_PHOTOS
})

export async function getPhotoBySlug(slug: string): Promise<Photo | undefined> {
  const photos = await getPhotos()
  return photos.find((p) => p.slug === slug)
}

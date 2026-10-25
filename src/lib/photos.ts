import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getPayload, isPayloadUnavailable } from './payload'
import { findGalleryPhotos } from './photoGallery'
import { hasPhotoRenditions, photoRenditionURL } from './photoRenditions'
import { normalizeSiteOrigin } from './structuredData'

export const SITE_URL = normalizeSiteOrigin()
export const PHOTO_FEED_URL = `${SITE_URL}/photos/feed.json`

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
  /** Web copy for gallery tiles and thumbnails; the original until one exists. */
  thumbnailSrc: string
  /** Web copy for the full-screen viewer; the original until one exists. */
  displaySrc: string
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
    thumbnailSrc: 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/photos/DSCF0017-2000x1333.jpg',
    displaySrc: 'https://pub-0c00865d02c1476494008dbb74525b2a.r2.dev/photos/DSCF0017-2000x1333.jpg',
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

export const getGalleryPhotoDocuments = cache(unstable_cache(async () => {
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Photo gallery unavailable')
  return findGalleryPhotos(payload)
}, ['gallery-photos-v1'], { tags: ['gallery-photos'], revalidate: 3600 }))

/** Which originals already have web copies, rechecked when the gallery changes. */
const getPhotosWithRenditions = unstable_cache(async (filenames: string[]) => {
  const available = await Promise.all(filenames.map(async (filename) => (await hasPhotoRenditions(filename) ? filename : null)))
  return available.filter((filename): filename is string => Boolean(filename))
}, ['photo-renditions-v1'], { tags: ['gallery-photos'], revalidate: 3600 })

export const getPhotos = cache(async (): Promise<Photo[]> => {
  const result = await getGalleryPhotoDocuments()
  const filenames = result.docs.flatMap((doc) => (doc.filename ? [doc.filename] : [])).sort()
  const withRenditions = new Set(await getPhotosWithRenditions(filenames).catch(() => []))
  const photos = result.docs
    .map((doc) => {
      const src = doc.url
      if (!src || !doc.slug) return null
      const hasRenditions = Boolean(doc.filename && withRenditions.has(doc.filename))
      const rendition = (name: 'grid' | 'display') =>
        (hasRenditions && doc.filename && photoRenditionURL(doc.filename, name)) || src

      const width = doc.width ?? 0
      const height = doc.height ?? 0
      const exif: PhotoExif = Object.fromEntries(
        Object.entries(doc.exif ?? {}).filter(([, value]) => value != null && value !== ''),
      )
      if (exif.aperture) exif.aperture = exif.aperture.replace(/^f\//i, 'ƒ/')

      return {
        slug: doc.slug,
        src,
        thumbnailSrc: rendition('grid'),
        displaySrc: rendition('display'),
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

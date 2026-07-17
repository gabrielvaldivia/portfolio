import fs from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import sharp from 'sharp'
import exifReader from 'exif-reader'

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
  /** Filename inside public/photos, e.g. "some-photo.jpg" */
  file: string
  /** Site-relative src for rendering, e.g. "/photos/some-photo.jpg" */
  src: string
  width: number
  height: number
  /** RFC 3339, from EXIF DateTimeOriginal (file mtime fallback) */
  datePublished: string
  exif: PhotoExif
}

const PHOTOS_DIR = path.join(process.cwd(), 'public', 'photos')
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function slugify(filename: string): string {
  return path
    .parse(filename)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatCamera(make?: string, model?: string): string | undefined {
  if (!model) return make || undefined
  const cleanMake = make?.trim()
  const cleanModel = model.trim()
  if (!cleanMake) return cleanModel
  // Avoid "FUJIFILM FUJIFILM X-E5" — many models already embed the make
  if (cleanModel.toLowerCase().startsWith(cleanMake.toLowerCase())) return cleanModel
  const displayMake = cleanMake === cleanMake.toUpperCase()
    ? cleanMake.charAt(0) + cleanMake.slice(1).toLowerCase()
    : cleanMake
  return `${displayMake} ${cleanModel}`
}

function formatShutter(exposureTime?: number): string | undefined {
  if (!exposureTime || exposureTime <= 0) return undefined
  if (exposureTime >= 1) return `${Number(exposureTime.toFixed(1))}s`
  return `1/${Math.round(1 / exposureTime)}`
}

async function loadPhoto(file: string): Promise<Photo> {
  const filePath = path.join(PHOTOS_DIR, file)
  const [metadata, stat] = await Promise.all([
    sharp(filePath).metadata(),
    fs.stat(filePath),
  ])

  let date: Date = stat.mtime
  const exif: PhotoExif = {}

  if (metadata.exif) {
    try {
      const parsed = exifReader(metadata.exif)
      const image = parsed.Image ?? {}
      const photo = parsed.Photo ?? {}

      if (photo.DateTimeOriginal instanceof Date) date = photo.DateTimeOriginal
      else if (image.DateTime instanceof Date) date = image.DateTime

      exif.camera = formatCamera(image.Make as string | undefined, image.Model as string | undefined)
      exif.lens = (photo.LensModel as string | undefined)?.trim() || undefined
      exif.shutter = formatShutter(photo.ExposureTime as number | undefined)
      if (typeof photo.FNumber === 'number') exif.aperture = `f/${Number(photo.FNumber.toFixed(1))}`
      const iso = (photo as any).ISOSpeedRatings ?? (photo as any).PhotographicSensitivity ?? (photo as any).ISO
      if (iso != null) exif.iso = String(Array.isArray(iso) ? iso[0] : iso)
      if (typeof photo.FocalLength === 'number') exif.focal = `${Number(photo.FocalLength.toFixed(1))}mm`
    } catch {
      // Unparseable EXIF — fall back to file mtime, no shooting metadata
    }
  }

  const orientation = metadata.orientation ?? 1
  const swapped = orientation >= 5
  const width = (swapped ? metadata.height : metadata.width) ?? 0
  const height = (swapped ? metadata.width : metadata.height) ?? 0

  return {
    slug: slugify(file),
    file,
    src: `/photos/${encodeURIComponent(file)}`,
    width,
    height,
    datePublished: date.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    exif,
  }
}

export const getPhotos = cache(async (): Promise<Photo[]> => {
  let entries: string[]
  try {
    entries = await fs.readdir(PHOTOS_DIR)
  } catch {
    return []
  }
  const files = entries.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
  const photos = await Promise.all(files.map(loadPhoto))
  return photos.sort((a, b) => b.datePublished.localeCompare(a.datePublished))
})

export async function getPhotoBySlug(slug: string): Promise<Photo | undefined> {
  const photos = await getPhotos()
  return photos.find((p) => p.slug === slug)
}

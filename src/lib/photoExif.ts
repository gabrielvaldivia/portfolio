import sharp from 'sharp'
import exifReader from 'exif-reader'

export type ExtractedPhotoExif = {
  captureDate?: Date
  camera?: string
  lens?: string
  shutter?: string
  aperture?: string
  iso?: string
  focal?: string
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

export async function extractPhotoExif(buffer: Buffer): Promise<ExtractedPhotoExif> {
  const result: ExtractedPhotoExif = {}

  let exifBuffer: Buffer | undefined
  try {
    exifBuffer = (await sharp(buffer).metadata()).exif
  } catch {
    return result
  }
  if (!exifBuffer) return result

  try {
    const parsed = exifReader(exifBuffer)
    const image = parsed.Image ?? {}
    const photo = parsed.Photo ?? {}

    if (photo.DateTimeOriginal instanceof Date) result.captureDate = photo.DateTimeOriginal
    else if (image.DateTime instanceof Date) result.captureDate = image.DateTime

    result.camera = formatCamera(image.Make as string | undefined, image.Model as string | undefined)
    result.lens = (photo.LensModel as string | undefined)?.trim() || undefined
    result.shutter = formatShutter(photo.ExposureTime as number | undefined)
    if (typeof photo.FNumber === 'number') result.aperture = `f/${Number(photo.FNumber.toFixed(1))}`
    const iso = (photo as any).ISOSpeedRatings ?? (photo as any).PhotographicSensitivity ?? (photo as any).ISO
    if (iso != null) result.iso = String(Array.isArray(iso) ? iso[0] : iso)
    if (typeof photo.FocalLength === 'number') result.focal = `${Number(photo.FocalLength.toFixed(1))}mm`
  } catch {
    // Unparseable EXIF — no shooting metadata
  }

  return result
}

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'

/**
 * Camera originals are 4–5 MB. Photos upload straight from the browser to R2,
 * so Payload never resizes them; these web copies are made afterward instead.
 * Their keys follow from the original's filename, so no database field is needed.
 */
export const PHOTO_RENDITION_WIDTHS = { grid: 1200, display: 2400 } as const
type RenditionName = keyof typeof PHOTO_RENDITION_WIDTHS

const clean = (value?: string) => (value || '').replace(/\\n/g, '').replace(/[\r\n]/g, '').trim()

function r2Config() {
  const bucket = clean(process.env.R2_BUCKET)
  const endpoint = clean(process.env.R2_ENDPOINT)
  const accessKeyId = clean(process.env.R2_ACCESS_KEY_ID)
  const secretAccessKey = clean(process.env.R2_SECRET_ACCESS_KEY)
  const publicURL = clean(process.env.R2_PUBLIC_URL).replace(/\/+$/, '')
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey || !publicURL) return null
  return { bucket, endpoint, accessKeyId, secretAccessKey, publicURL }
}

export function photoRenditionKey(filename: string, name: RenditionName) {
  const base = filename.replace(/\.[^./]+$/, '')
  return `photos/renditions/${base}-${PHOTO_RENDITION_WIDTHS[name]}.webp`
}

export function photoRenditionURL(filename: string, name: RenditionName) {
  const publicURL = clean(process.env.R2_PUBLIC_URL).replace(/\/+$/, '')
  return publicURL ? `${publicURL}/${photoRenditionKey(filename, name)}` : null
}

let client: S3Client | null = null
function storage() {
  const config = r2Config()
  if (!config) return null
  client ||= new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  })
  return { client, bucket: config.bucket }
}

/** Resizes an original and uploads both web copies. Existing copies are replaced. */
export async function createPhotoRenditions(original: Buffer, filename: string) {
  const target = storage()
  if (!target) return false
  await Promise.all(Object.entries(PHOTO_RENDITION_WIDTHS).map(async ([name, width]) => {
    const body = await sharp(original)
      .rotate() // Apply EXIF orientation before metadata is stripped.
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    await target.client.send(new PutObjectCommand({
      Bucket: target.bucket,
      Key: photoRenditionKey(filename, name as RenditionName),
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }))
  }))
  return true
}

export async function hasPhotoRenditions(filename: string) {
  const target = storage()
  if (!target) return false
  try {
    await Promise.all(Object.keys(PHOTO_RENDITION_WIDTHS).map((name) => target.client.send(new HeadObjectCommand({
      Bucket: target.bucket,
      Key: photoRenditionKey(filename, name as RenditionName),
    }))))
    return true
  } catch {
    return false
  }
}

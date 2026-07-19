import type { CollectionConfig } from 'payload'
import { extractPhotoExif, type ExtractedPhotoExif } from '../lib/photoExif'

function slugifyFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getUniquePhotoSlug({ req, slug }: { req: any; slug: string }): Promise<string> {
  const baseSlug = slug || 'photo'
  let candidate = baseSlug

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const existing = await req.payload.find({
      collection: 'photos',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { slug: { equals: candidate } },
    })

    if (!existing.docs.length) return candidate
    candidate = `${baseSlug}-${suffix}`
  }

  return `${baseSlug}-${Date.now()}`
}

function applyExtractedExif(data: Record<string, any>, extracted: ExtractedPhotoExif) {
  if (extracted.captureDate && !data.captureDate) {
    data.captureDate = extracted.captureDate.toISOString()
  }
  const { captureDate: _captureDate, ...fields } = extracted
  data.exif = {
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value != null)),
    ...Object.fromEntries(Object.entries(data.exif ?? {}).filter(([, value]) => value != null)),
  }
}

function getStorageSafeBuffer(value: unknown): unknown {
  if (!Buffer.isBuffer(value)) return value
  if (typeof SharedArrayBuffer === 'undefined' || !(value.buffer instanceof SharedArrayBuffer)) return value

  const copy = Buffer.allocUnsafe(value.byteLength)
  value.copy(copy)
  return copy
}

function normalizeUploadSizeBuffers(uploadSizes: unknown) {
  if (!uploadSizes || typeof uploadSizes !== 'object') return

  const sizes = uploadSizes as Record<string, unknown>
  Object.keys(sizes).forEach((key) => {
    sizes[key] = getStorageSafeBuffer(sizes[key])
  })
}

function normalizeCloudUploadBuffers(req: any) {
  if (req.file?.data) req.file.data = getStorageSafeBuffer(req.file.data)
  normalizeUploadSizeBuffers(req.payloadUploadSizes)

  const cloudStorageContext = req.context?._payloadCloudStorage
  if (cloudStorageContext?.file?.data) {
    cloudStorageContext.file.data = getStorageSafeBuffer(cloudStorageContext.file.data)
  }
  normalizeUploadSizeBuffers(cloudStorageContext?.uploadSizes)
}

export const Photos: CollectionConfig = {
  slug: 'photos',
  access: {
    read: () => true,
  },
  admin: {
    components: {
      beforeListTable: ['./components/admin/PhotosListActions#PhotosListUploadStatus'],
      edit: {
        SaveButton: './components/admin/MediaSaveButton#MediaSaveButton',
      },
      views: {
        list: {
          Component: './components/admin/PhotosListView#PhotosListView',
          actions: ['./components/admin/PhotosListActions#PhotosListAddAction'],
        },
      },
    },
    pagination: { defaultLimit: 500 },
    group: 'Collections',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'captureDate', 'slug'],
  },
  upload: {
    bulkUpload: false,
    mimeTypes: ['image/*'],
    imageSizes: [
      // EXIF-stripped web rendition; the untouched original stays in R2
      { name: 'web', width: 2000, height: undefined, position: 'centre' },
    ],
  },
  hooks: {
    beforeChange: [
      // Local API uploads (and any server-side upload) carry the file buffer
      async ({ data, operation, req }) => {
        if (req.file?.data) {
          applyExtractedExif(data, await extractPhotoExif(req.file.data))
          if (req.context) req.context.photoExifExtracted = true
        }
        if (!data.slug && data.filename) data.slug = slugifyFilename(data.filename)
        if (operation === 'create' && data.slug) data.slug = await getUniquePhotoSlug({ req, slug: data.slug })
        return data
      },
    ],
    afterChange: [
      // Admin-panel uploads go straight from the browser to R2 (clientUploads),
      // so the buffer never reaches the server — fetch the original back once
      async ({ doc, operation, req }) => {
        normalizeCloudUploadBuffers(req)
        if (operation !== 'create') return doc
        if (req.context?.photoExifExtracted || req.context?.photoExifBackfill) return doc
        if (!doc.url || !/^https?:\/\//.test(doc.url)) return doc
        try {
          const res = await fetch(doc.url)
          if (!res.ok) return doc
          const buffer = Buffer.from(await res.arrayBuffer())
          const data: Record<string, any> = { captureDate: doc.captureDate, exif: doc.exif }
          applyExtractedExif(data, await extractPhotoExif(buffer))
          await req.payload.update({
            collection: 'photos',
            id: doc.id,
            data: { captureDate: data.captureDate, exif: data.exif },
            context: { photoExifBackfill: true },
          })
        } catch (error) {
          req.payload.logger.warn({ err: error, msg: `Photo EXIF backfill failed for ${doc.filename}` })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Generated from the filename on upload',
      },
    },
    {
      name: 'captureDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Read from EXIF on upload; falls back to upload time when empty',
      },
    },
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'exif',
      type: 'group',
      admin: {
        description: 'Read from EXIF on upload; editable',
      },
      fields: [
        { name: 'camera', type: 'text' },
        { name: 'lens', type: 'text' },
        { name: 'shutter', type: 'text' },
        { name: 'aperture', type: 'text' },
        { name: 'iso', type: 'text' },
        { name: 'focal', type: 'text' },
      ],
    },
  ],
}

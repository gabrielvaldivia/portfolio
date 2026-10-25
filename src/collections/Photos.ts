import { createPhotoRenditions } from '../lib/photoRenditions'
import type { CollectionConfig } from 'payload'
import { extractPhotoExif, type ExtractedPhotoExif } from '../lib/photoExif'
import { normalizeCloudUploadBuffers } from '../lib/payloadUploadBuffers'

function slugifyFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function getUniquePhotoSlug({ req, slug }: { req: any; slug: string }): Promise<string> {
  const baseSlug = slug || 'photo'
  // Camera filenames repeat across cards, so check a batch of suffixes in one query.
  const candidates = [baseSlug, ...Array.from({ length: 99 }, (_, index) => `${baseSlug}-${index + 2}`)]
  const existing = await req.payload.find({
    collection: 'photos',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    select: { slug: true },
    where: { slug: { in: candidates } },
  })
  const taken = new Set(existing.docs.map((doc: { slug?: string }) => doc.slug))

  return candidates.find((candidate) => !taken.has(candidate)) || `${baseSlug}-${Date.now()}`
}

async function fetchOriginal(url: unknown) {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return null
  const response = await fetch(url)
  return response.ok ? Buffer.from(await response.arrayBuffer()) : null
}

/** Uses Next's after() in a request; CLI scripts and migrations run the work inline. */
async function runAfterResponse(work: () => Promise<void>) {
  try {
    const { after } = await import('next/server')
    after(work)
  } catch {
    await work()
  }
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
    // Keep the CMS save request lightweight on Vercel. Payload otherwise
    // downloads the just-uploaded original, runs Sharp, and uploads a second
    // rendition before it can create the document, which can leave the mobile
    // admin waiting until the serverless request times out.
    focalPoint: false,
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
      // Make web-sized copies after the response, so saving never waits on resizing.
      async ({ doc, operation, previousDoc, req }) => {
        const fileChanged = operation === 'create' || doc.filename !== previousDoc?.filename
        if (!fileChanged || !doc.filename || req.context?.photoExifBackfill) return doc
        const localFile = req.file?.data
        await runAfterResponse(async () => {
          try {
            const original = localFile || await fetchOriginal(doc.url)
            if (original && await createPhotoRenditions(original, doc.filename)) {
              const { revalidateTag } = await import('next/cache')
              revalidateTag('gallery-photos', { expire: 0 })
            }
          } catch (error) {
            req.payload.logger.warn({ err: error, msg: `Photo renditions failed for ${doc.filename}` })
          }
        })
        return doc
      },
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

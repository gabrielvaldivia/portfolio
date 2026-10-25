import { z } from 'zod'
import type { MCPPluginConfig } from '@payloadcms/plugin-mcp'
import type { PayloadRequest } from 'payload'

const noteFields = new Set(['title', 'slug', 'body', 'excerpt', 'coverImage', 'meta'])
const MAX_NOTE_JSON_CHARS = 1_000_000
const MAX_ASSET_BYTES = 3 * 1024 * 1024

function parseNoteData(value: unknown) {
  if (typeof value !== 'string' || value.length > MAX_NOTE_JSON_CHARS) {
    throw new Error(`Note data must be JSON under ${MAX_NOTE_JSON_CHARS} characters.`)
  }

  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Note data must be a JSON object.')
  }

  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => noteFields.has(key)),
  )
}

function resultText(message: string, value: unknown) {
  return {
    content: [{ type: 'text' as const, text: `${message}\n${JSON.stringify(value, null, 2)}` }],
  }
}

function requireUser(req: PayloadRequest) {
  if (req.user?.collection !== 'users') throw new Error('An authenticated portfolio editor is required.')
  return req.user
}

async function createNoteDraft(args: Record<string, unknown>, req: PayloadRequest) {
  const user = requireUser(req)
  const data = parseNoteData(args.data)
  const doc = await req.payload.create({
    collection: 'notes',
    data,
    draft: true,
    overrideAccess: false,
    req,
    user,
  })

  return resultText('Note draft created.', { id: doc.id, title: doc.title, slug: doc.slug, status: doc._status })
}

async function updateNoteDraft(args: Record<string, unknown>, req: PayloadRequest) {
  const user = requireUser(req)
  const id = Number(args.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Note ID must be a positive integer.')

  const doc = await req.payload.update({
    collection: 'notes',
    id,
    data: parseNoteData(args.data),
    draft: true,
    overrideAccess: false,
    req,
    user,
  })

  return resultText('Note draft updated.', { id: doc.id, title: doc.title, slug: doc.slug, status: doc._status })
}

async function publishNote(args: Record<string, unknown>, req: PayloadRequest) {
  const user = requireUser(req)
  const id = Number(args.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Note ID must be a positive integer.')

  // Depth 0 keeps relationships as IDs, so the draft can be written back as-is.
  const draft = await req.payload.findByID({
    collection: 'notes',
    id,
    depth: 0,
    draft: true,
    overrideAccess: false,
    req,
    user,
  })
  const draftFields = Object.fromEntries(Object.entries(draft).filter(([key]) => noteFields.has(key)))
  // Keep an existing past date so republishing does not reorder the note. A
  // future date would schedule it instead, so publishing now replaces it.
  const existingDate = typeof draft.publishedAt === 'string' ? Date.parse(draft.publishedAt) : NaN
  const publishedAt = existingDate <= Date.now() ? draft.publishedAt : new Date().toISOString()

  const doc = await req.payload.update({
    collection: 'notes',
    id,
    data: {
      ...draftFields,
      _status: 'published',
      publishedAt,
    },
    draft: false,
    overrideAccess: false,
    req,
    user,
  })

  return resultText(
    'Note published. First-time publication may have queued a newsletter for subscribers.',
    { id: doc.id, title: doc.title, slug: doc.slug, status: doc._status, publishedAt: doc.publishedAt },
  )
}

async function scheduleNote(args: Record<string, unknown>, req: PayloadRequest) {
  const user = requireUser(req)
  const id = Number(args.id)
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Note ID must be a positive integer.')
  if (typeof args.publishAt !== 'string') throw new Error('publishAt must be an ISO date and time.')

  const scheduledAt = new Date(args.publishAt)
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    throw new Error('publishAt must be a valid future date and time.')
  }

  const draft = await req.payload.findByID({
    collection: 'notes',
    id,
    draft: true,
    overrideAccess: false,
    req,
    user,
  })

  const doc = await req.payload.update({
    collection: 'notes',
    id,
    data: {
      ...parseNoteData(JSON.stringify(draft)),
      _status: 'published',
      publishedAt: scheduledAt.toISOString(),
    },
    draft: false,
    overrideAccess: false,
    req,
    user,
  })

  return resultText('Note scheduled.', {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    status: doc._status,
    scheduledFor: doc.scheduledFor,
  })
}

async function uploadPortfolioAsset(args: Record<string, unknown>, req: PayloadRequest) {
  const user = requireUser(req)
  const collection = args.assetType
  const fileName = args.fileName
  const mimeType = args.mimeType
  const encoded = args.base64Data

  if (collection !== 'media' && collection !== 'photos') {
    throw new Error('assetType must be "media" or "photos".')
  }
  if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > 180 || /[\\/\0]/.test(fileName)) {
    throw new Error('fileName must be a simple filename under 180 characters.')
  }
  if (typeof mimeType !== 'string' || mimeType.length > 120) {
    throw new Error('A valid mimeType is required.')
  }
  if (typeof encoded !== 'string' || encoded.length > 4_194_304 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error('base64Data must be valid base64 for an asset no larger than 3 MiB.')
  }

  const isImage = mimeType.startsWith('image/')
  const isVideo = mimeType.startsWith('video/')
  if (!isImage && !(collection === 'media' && isVideo)) {
    throw new Error(collection === 'photos' ? 'Photos accepts image files only.' : 'Media accepts image and video files only.')
  }

  const data = Buffer.from(encoded, 'base64')
  if (!data.length || data.length > MAX_ASSET_BYTES) {
    throw new Error('Asset must be between 1 byte and 3 MiB.')
  }

  const doc = await req.payload.create({
    collection,
    data: { alt: typeof args.alt === 'string' ? args.alt : '' },
    file: { data, mimetype: mimeType, name: fileName, size: data.length },
    overrideAccess: false,
    req,
    user,
  })

  return resultText('Portfolio asset uploaded.', {
    id: doc.id,
    filename: doc.filename,
    url: doc.url,
    alt: doc.alt,
    mimeType: doc.mimeType,
  })
}

export const portfolioMcpTools: NonNullable<MCPPluginConfig['mcp']>['tools'] = [
  {
    name: 'createNoteDraft',
    description: 'Create a portfolio note as a private draft. Provide data as a JSON object string with title, slug, body, excerpt, coverImage, or meta fields. Publication dates and status are intentionally managed separately.',
    parameters: {
      data: z.string().max(MAX_NOTE_JSON_CHARS).describe('JSON object string containing editable note fields.'),
    },
    handler: createNoteDraft,
  },
  {
    name: 'updateNoteDraft',
    description: 'Update a note draft without publishing it. Provide the note ID and data as a JSON object string. Only title, slug, body, excerpt, coverImage, and meta are accepted.',
    parameters: {
      id: z.string().describe('Numeric Payload note ID.'),
      data: z.string().max(MAX_NOTE_JSON_CHARS).describe('JSON object string containing fields to update.'),
    },
    handler: updateNoteDraft,
  },
  {
    name: 'publishNote',
    description: 'Publish the saved draft of a note immediately. First-time publication queues a newsletter for subscribers.',
    parameters: {
      id: z.string().describe('Numeric Payload note ID to publish.'),
    },
    handler: publishNote,
  },
  {
    name: 'scheduleNote',
    description: 'Schedule the saved draft of a note for a future date and time. The scheduled publishing workflow will publish it then; first-time publication can queue a newsletter.',
    parameters: {
      id: z.string().describe('Numeric Payload note ID to schedule.'),
      publishAt: z.string().describe('Future ISO date and time, including the intended timezone offset.'),
    },
    handler: scheduleNote,
  },
  {
    name: 'uploadPortfolioAsset',
    description: 'Upload an image, SVG, or video to portfolio media, or an image to the photo gallery. Supply base64 data; files are limited to 3 MiB. Use the returned ID in page and project content.',
    parameters: {
      assetType: z.enum(['media', 'photos']).describe('Choose general media or a gallery photo.'),
      fileName: z.string().min(1).max(180).describe('Simple file name including its extension.'),
      mimeType: z.string().min(1).max(120).describe('MIME type such as image/jpeg or video/mp4.'),
      base64Data: z.string().max(4_194_304).describe('Base64-encoded file content, up to 3 MiB decoded.'),
      alt: z.string().max(500).optional().describe('Alternative text or photo description.'),
    },
    handler: uploadPortfolioAsset,
  },
]

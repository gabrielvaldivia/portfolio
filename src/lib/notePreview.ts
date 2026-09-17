import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Payload, PayloadRequest } from 'payload'
import { getPayloadSecret } from './payloadSecret'

const PREVIEW_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

type NotePreviewToken = {
  noteID: number
  expiresAt: number
}

function signPreview(payload: string) {
  // Separate this capability from every other use of the Payload secret.
  return createHmac('sha256', getPayloadSecret())
    .update(`note-preview-v1:${payload}`)
    .digest('base64url')
}

export function createNotePreviewToken(noteID: number, now = Date.now()) {
  if (!Number.isSafeInteger(noteID) || noteID <= 0) throw new Error('Invalid note ID')

  const payload = Buffer.from(JSON.stringify({
    noteID,
    expiresAt: now + PREVIEW_LIFETIME_MS,
  } satisfies NotePreviewToken)).toString('base64url')

  return `${payload}.${signPreview(payload)}`
}

export function verifyNotePreviewToken(token: string, now = Date.now()): NotePreviewToken | null {
  if (token.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) return null

  const [payload, signature] = token.split('.')
  const expected = signPreview(payload)
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as NotePreviewToken
    if (!Number.isSafeInteger(value.noteID) || value.noteID <= 0) return null
    if (!Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now) return null
    return { noteID: value.noteID, expiresAt: value.expiresAt }
  } catch {
    return null
  }
}

export function generateNotePreviewURL(doc: Record<string, unknown>, { req }: { req: PayloadRequest }) {
  if (req.user?.collection !== 'users' || typeof doc.id !== 'number') return null
  return `/notes/preview/${createNotePreviewToken(doc.id)}`
}

export async function getNotePreview(
  token: string,
  loadPayload: () => Promise<Pick<Payload, 'findByID'>>,
) {
  const access = verifyNotePreviewToken(token)
  if (!access) return null

  const payload = await loadPayload()
  // This is the only access override: a verified token authorizes one note.
  const note = await payload.findByID({
    collection: 'notes',
    id: access.noteID,
    draft: true,
    overrideAccess: true,
    disableErrors: true,
    depth: 1,
    select: { title: true, body: true, coverImage: true, createdAt: true, publishedAt: true },
  })

  return note ? { note, expiresAt: access.expiresAt } : null
}

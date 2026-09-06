import { NextRequest } from 'next/server'
import { getVisitor, getVisitorHash, withVisitorCookie } from '@/lib/anonymousVisitor'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getPayloadSecret } from '@/lib/payloadSecret'
import { getNoteHighlightText, parseHighlightAnchor } from '@/lib/noteHighlightAnchors'
import { checkHighlightRateLimit, HighlightError, highlightTextVersion, loadPublicHighlights, writeHighlight } from '@/lib/noteHighlightStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getNote(noteId: unknown) {
  if (typeof noteId !== 'string' || !/^[1-9]\d{0,9}$/.test(noteId)) throw new HighlightError('A valid note is required.', 400)
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new HighlightError('Highlights are temporarily unavailable. Please try again.', 503)
  const result = await payload.find({
    collection: 'notes', depth: 0, draft: false, limit: 1,
    where: { and: [{ id: { equals: Number(noteId) } }, { _status: { equals: 'published' } }] },
    select: { body: true },
  })
  if (!result.docs[0]) throw new HighlightError('Note not found.', 404)
  const text = getNoteHighlightText(result.docs[0].body)
  return { db: payload.db.drizzle, id: Number(noteId), text, version: highlightTextVersion(text) }
}

async function respond(req: NextRequest, mutate: boolean) {
  const visitor = getVisitor(req)
  const visitorHash = getVisitorHash(visitor.id)
  try {
    let body: { noteId?: unknown; anchor?: unknown; version?: unknown } = {}
    if (mutate) {
      const origin = req.headers.get('origin')
      if ((origin && origin !== req.nextUrl.origin) || req.headers.get('sec-fetch-site') === 'cross-site') {
        throw new HighlightError('Please highlight directly on this website.', 403)
      }
      if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HighlightError('JSON is required.', 415)
      // Bound the streamed request too; Content-Length is not trustworthy.
      const reader = req.body?.getReader()
      if (!reader) throw new HighlightError('A passage is required.', 400)
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 8_192) { await reader.cancel(); throw new HighlightError('Select a shorter passage.', 413) }
        chunks.push(value)
      }
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HighlightError('Invalid request.', 400) }
      if (!body || typeof body !== 'object') throw new HighlightError('Invalid request.', 400)
    }
    const anchor = mutate ? parseHighlightAnchor(body.anchor) : null
    if (mutate && !anchor) throw new HighlightError('Select between 3 and 1,000 characters in the note.', 400)
    const note = await getNote(mutate ? body.noteId : req.nextUrl.searchParams.get('noteId'))
    if (mutate && anchor) {
      if (body.version !== note.version) throw new HighlightError('This note changed. Refresh it before highlighting.', 409)
      const ip = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      if (!await checkHighlightRateLimit(note.db, [`visitor:${visitor.id}`, `ip:${ip}`], getPayloadSecret())) {
        throw new HighlightError('Too many highlights at once. Please try again later.', 429)
      }
      await writeHighlight(note.db, note.id, note.text, visitorHash, anchor, req.method === 'DELETE')
    }
    return withVisitorCookie({
      highlights: await loadPublicHighlights(note.db, note.id, note.text, visitorHash), version: note.version,
    }, visitor)
  } catch (error) {
    const status = error instanceof HighlightError ? error.status : 503
    if (!(error instanceof HighlightError)) console.error('Note highlights unavailable', error instanceof Error ? error.name : 'unknown')
    return withVisitorCookie({ error: error instanceof HighlightError ? error.message : 'Highlights are temporarily unavailable. Please try again.' }, visitor, {
      status, headers: status === 429 ? { 'Retry-After': '3600' } : undefined,
    })
  }
}

export async function GET(req: NextRequest) { return respond(req, false) }
export async function POST(req: NextRequest) { return respond(req, true) }
export async function DELETE(req: NextRequest) { return respond(req, true) }

import { NextRequest } from 'next/server'
import { getVisitor, getVisitorHash, withVisitorCookie } from '@/lib/anonymousVisitor'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getPayloadSecret } from '@/lib/payloadSecret'
import { parseHighlightAnchor } from '@/lib/noteHighlightAnchors'
import { getPublishedHighlightText, loadPublishedHighlightText } from '@/lib/noteHighlightContent'
import { getHighlightRequestLocation } from '@/lib/noteHighlightAttribution'
import { checkHighlightRateLimit, HighlightError, highlightTextVersion, isHighlightingPaused, loadPublicHighlights, writeHighlight } from '@/lib/noteHighlightStore'
import { checkHighlightOrigin, readHighlightJSON } from '@/lib/noteHighlightRequest'

export const runtime = 'nodejs'
export const revalidate = 0

async function getNote(noteId: unknown, mutate: boolean) {
  if (typeof noteId !== 'string' || !/^[1-9]\d{0,9}$/.test(noteId)) throw new HighlightError('A valid note is required.', 400)
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new HighlightError('Highlights are temporarily unavailable. Please try again.', 503)
  const text = await (mutate ? loadPublishedHighlightText : getPublishedHighlightText)(Number(noteId))
  if (text === null) throw new HighlightError('Note not found.', 404)
  return { db: payload.db.drizzle, id: Number(noteId), text, version: highlightTextVersion(text) }
}

async function respond(req: NextRequest, mutate: boolean) {
  const visitor = getVisitor(req)
  const visitorHash = getVisitorHash(visitor.id)
  try {
    let body: { noteId?: unknown; anchor?: unknown; version?: unknown } = {}
    if (mutate) {
      checkHighlightOrigin(req)
      body = await readHighlightJSON(req)
    }
    const anchor = mutate ? parseHighlightAnchor(body.anchor) : null
    if (mutate && !anchor) throw new HighlightError('Select between 3 and 1,000 characters in the note.', 400)
    const note = await getNote(mutate ? body.noteId : req.nextUrl.searchParams.get('noteId'), mutate)
    if (mutate && anchor) {
      if (body.version !== note.version) throw new HighlightError('This note changed. Refresh it before highlighting.', 409)
      const ip = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      if (!await checkHighlightRateLimit(note.db, [`visitor:${visitor.id}`, `ip:${ip}`], getPayloadSecret())) {
        throw new HighlightError('Too many highlights at once. Please try again later.', 429)
      }
      await writeHighlight(note.db, note.id, note.text, visitorHash, anchor, req.method === 'DELETE', getHighlightRequestLocation(req.headers))
    }
    return withVisitorCookie({
      highlights: await loadPublicHighlights(note.db, note.id, note.text, visitorHash), version: note.version,
      paused: await isHighlightingPaused(note.db, note.id),
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

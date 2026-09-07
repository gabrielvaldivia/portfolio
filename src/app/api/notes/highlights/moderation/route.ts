import { NextRequest, NextResponse } from 'next/server'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getNoteHighlightText } from '@/lib/noteHighlightAnchors'
import { HighlightError } from '@/lib/noteHighlightStore'
import { loadHighlightModeration, moderateHighlights, parseHighlightModerationAction, requireHighlightModerator } from '@/lib/noteHighlightModeration'
import { checkHighlightOrigin, readHighlightJSON } from '@/lib/noteHighlightRequest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function respond(req: NextRequest, mutate: boolean) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' }
  try {
    if (mutate) checkHighlightOrigin(req, true)
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new HighlightError('Highlight moderation is temporarily unavailable.', 503)
    const { user } = await payload.auth({ headers: req.headers })
    requireHighlightModerator(user)
    const body = mutate ? await readHighlightJSON(req) : null
    const noteId = mutate ? body?.noteId : req.nextUrl.searchParams.get('noteId')
    if (typeof noteId !== 'string' || !/^[1-9]\d{0,9}$/.test(noteId)) throw new HighlightError('A valid note is required.', 400)
    // Authenticated CMS editors can moderate drafts too; never mutate note content or publish it.
    const result = await payload.find({ collection: 'notes', user, overrideAccess: false, depth: 0, limit: 1,
      where: { id: { equals: Number(noteId) } }, select: { body: true } })
    const note = result.docs[0]
    if (!note) throw new HighlightError('Note not found.', 404)
    const data = mutate
      ? await moderateHighlights(payload.db.drizzle, Number(noteId), getNoteHighlightText(note.body), parseHighlightModerationAction(body))
      : await loadHighlightModeration(payload.db.drizzle, Number(noteId))
    return NextResponse.json(data, { headers })
  } catch (error) {
    if (!(error instanceof HighlightError)) console.error('Highlight moderation unavailable', error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: error instanceof HighlightError ? error.message : 'Highlight moderation is temporarily unavailable. Please try again.' },
      { status: error instanceof HighlightError ? error.status : 503, headers })
  }
}

export async function GET(req: NextRequest) { return respond(req, false) }
export async function POST(req: NextRequest) { return respond(req, true) }

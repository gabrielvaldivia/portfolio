import { NextRequest } from 'next/server'
import { getVisitor, getVisitorHash, withVisitorCookie } from '@/lib/anonymousVisitor'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getPayloadSecret } from '@/lib/payloadSecret'
import { checkHighlightRateLimit } from '@/lib/noteHighlightStore'
import { getNoteViewCount, recordNoteView } from '@/lib/noteViewStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function respond(req: NextRequest, record: boolean) {
  const visitor = getVisitor(req)
  const reply = (data: object, status = 200) => withVisitorCookie(data, visitor, {
    status, headers: status === 429 ? { 'Retry-After': '3600' } : undefined,
  })
  try {
    const id = req.nextUrl.searchParams.get('noteId')
    if (!id || !/^[1-9]\d{0,9}$/.test(id)) return reply({ error: 'A valid note is required.' }, 400)
    if (record) {
      const origin = req.headers.get('origin')
      if ((origin && origin !== req.nextUrl.origin) || req.headers.get('sec-fetch-site') === 'cross-site') {
        return reply({ error: 'Please view notes directly on this website.' }, 403)
      }
    }
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) return reply({ error: 'Views are temporarily unavailable.' }, 503)
    const noteId = Number(id)
    const note = await payload.find({
      collection: 'notes', depth: 0, draft: false, limit: 1,
      where: { and: [{ id: { equals: noteId } }, { _status: { equals: 'published' } }] },
      select: { title: true },
    })
    if (!note.docs[0]) return reply({ error: 'Note not found.' }, 404)
    const db = payload.db.drizzle
    if (record) {
      const ip = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      // Reuse the persistent limiter, with separate keys from highlight mutations.
      if (!await checkHighlightRateLimit(db, [`views:visitor:${visitor.id}`, `views:ip:${ip}`], getPayloadSecret())) {
        return reply({ error: 'Too many requests. Please try again later.' }, 429)
      }
    }
    const count = record ? await recordNoteView(db, noteId, getVisitorHash(visitor.id)) : await getNoteViewCount(db, noteId)
    return reply({ count })
  } catch (error) {
    console.error('Note views unavailable', error instanceof Error ? error.name : 'unknown')
    return reply({ error: 'Views are temporarily unavailable.' }, 503)
  }
}

export async function GET(req: NextRequest) { return respond(req, false) }
export async function POST(req: NextRequest) { return respond(req, true) }

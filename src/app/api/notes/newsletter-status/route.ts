import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getNoteNewsletterStatus } from '@/lib/noteNewsletterQueue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' }
  try {
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Database unavailable')
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
    const value = new URL(request.url).searchParams.get('noteId')
    const noteID = Number(value)
    if (!value || !Number.isSafeInteger(noteID) || noteID < 1) return Response.json({ error: 'Invalid note' }, { status: 400, headers })
    const result = await payload.find({ collection: 'notes', user, overrideAccess: false, depth: 0, limit: 1,
      where: { id: { equals: noteID } }, select: { _status: true, firstPublishedAt: true, newsletterSentAt: true } })
    const note = result.docs[0]
    if (!note) return Response.json({ error: 'Note not found' }, { status: 404, headers })
    return Response.json({ ...await getNoteNewsletterStatus(payload.db.drizzle, noteID),
      published: note._status === 'published', previouslyPublished: Boolean(note.firstPublishedAt), legacySentAt: note.newsletterSentAt }, { headers })
  } catch (error) {
    console.error('Newsletter status unavailable:', error instanceof Error ? error.name : 'unknown')
    return Response.json({ error: 'Email delivery status is temporarily unavailable.' }, { status: 503, headers })
  }
}

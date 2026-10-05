import { unstable_cache } from 'next/cache'
import { getPayload, isPayloadUnavailable } from './payload'
import { getNoteHighlightText } from './noteHighlightAnchors'

// Only the published text is shared. Highlight ownership and moderation are
// still read live for each visitor by the highlights endpoint.
export async function loadPublishedHighlightText(noteId: number) {
  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Note content unavailable')
  const result = await payload.find({
    collection: 'notes', depth: 0, draft: false, limit: 1,
    where: { and: [{ id: { equals: noteId } }, { _status: { equals: 'published' } }] },
    select: { body: true },
  })
  return result.docs[0] ? getNoteHighlightText(result.docs[0].body) : null
}

export const getPublishedHighlightText = unstable_cache(loadPublishedHighlightText,
  ['note-highlight-text-v1'], { tags: ['note-highlight-text'], revalidate: 3600 })

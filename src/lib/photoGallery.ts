import type { Payload } from 'payload'

function collectNotePhotoIDs(value: unknown, ids: Set<number | string>) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectNotePhotoIDs(item, ids)
    return
  }

  const node = value as Record<string, unknown>
  if (node.type === 'upload' && node.relationTo === 'photos') {
    const id = node.value && typeof node.value === 'object'
      ? (node.value as Record<string, unknown>).id
      : node.value
    if (typeof id === 'number' || typeof id === 'string') ids.add(id)
  }
  for (const child of Object.values(node)) collectNotePhotoIDs(child, ids)
}

/** Older note uploads share the Photos collection; keep them out of public galleries. */
export async function findGalleryPhotos(payload: Pick<Payload, 'find'>) {
  // Include both saved content and the latest autosave: an unpublished edit may
  // contain a new image, or may have removed one that is still in the live note.
  const notes = await Promise.all([false, true].map((draft) => payload.find({
    collection: 'notes',
    draft,
    overrideAccess: true,
    pagination: false,
    depth: 0,
    select: { body: true },
  })))
  const notePhotoIDs = new Set<number | string>()
  for (const result of notes) {
    for (const note of result.docs) collectNotePhotoIDs(note.body, notePhotoIDs)
  }

  return payload.find({
    collection: 'photos',
    limit: 500,
    depth: 0,
    sort: '-captureDate',
    ...(notePhotoIDs.size ? { where: { id: { not_in: [...notePhotoIDs] } } } : {}),
  })
}

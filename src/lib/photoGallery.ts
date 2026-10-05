import type { Payload } from 'payload'
import { sql } from '@payloadcms/db-postgres'

/** Older note uploads share the Photos collection; keep them out of public galleries. */
export async function findGalleryPhotos(payload: Pick<Payload, 'find' | 'db'>) {
  // Include both saved content and the latest autosave: an unpublished edit may
  // contain a new image, or may have removed one that is still in the live note.
  // Extract just upload IDs in Postgres instead of transferring every note body.
  const result = await payload.db.drizzle.execute(sql`
    SELECT DISTINCT CASE WHEN jsonb_typeof(reference.value) = 'object'
      THEN reference.value->'id' ELSE reference.value END AS photo_id
    FROM (
      SELECT body FROM notes
      UNION ALL
      SELECT version_body AS body FROM _notes_v WHERE latest = true
    ) AS bodies
    CROSS JOIN LATERAL jsonb_path_query(bodies.body,
      '$.** ? (@.type == "upload" && @.relationTo == "photos").value') AS reference(value)
  `)
  const rows = Array.isArray(result) ? result : result?.rows
  if (!Array.isArray(rows)) throw new Error('Photo exclusions unavailable')
  const notePhotoIDs = new Set<number | string>()
  for (const row of rows) {
    const id = (row as { photo_id: unknown }).photo_id
    if (typeof id === 'number' || typeof id === 'string') notePhotoIDs.add(id)
  }

  return payload.find({
    collection: 'photos',
    limit: 500,
    depth: 0,
    sort: '-captureDate',
    ...(notePhotoIDs.size ? { where: { id: { not_in: [...notePhotoIDs] } } } : {}),
  })
}

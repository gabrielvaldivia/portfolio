import { sql } from '@payloadcms/db-postgres'
import { APIError, type CollectionBeforeDeleteHook } from 'payload'

/** Rich-text uploads do not have database foreign keys to protect their files. */
export const protectNoteMedia: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const result = await req.payload.db.drizzle.execute(sql`
    SELECT title FROM (
      SELECT title, body, cover_image_id, meta_image_id FROM notes
      UNION ALL
      SELECT version_title, version_body, version_cover_image_id, version_meta_image_id
      FROM _notes_v WHERE latest = true
    ) AS note_content
    WHERE cover_image_id::text = ${String(id)}
      OR meta_image_id::text = ${String(id)}
      OR EXISTS (
        SELECT 1 FROM jsonb_path_query(note_content.body,
          '$.** ? (@.type == "upload" && @.relationTo == "media").value') AS reference(value)
        WHERE CASE WHEN jsonb_typeof(reference.value) = 'object'
          THEN reference.value->>'id' ELSE reference.value #>> '{}' END = ${String(id)}
      )
    LIMIT 1
  `)
  const rows = Array.isArray(result) ? result : result?.rows
  if (!Array.isArray(rows)) throw new Error('Could not check note media references.')
  if (rows.length) {
    const title = (rows[0] as { title: string | null }).title || 'Untitled note'
    throw new APIError(
      `This file is used in “${title}”. Remove it from the note and its latest draft before deleting it.`,
      409,
    )
  }
}

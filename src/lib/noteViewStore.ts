import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'

type ViewDB = { execute: (query: SQL) => Promise<unknown> }

export async function getNoteViewCount(db: ViewDB, noteId: number) {
  const result = await db.execute(sql`SELECT count(*)::int AS count FROM note_views WHERE note_id = ${noteId}`)
  const rows = Array.isArray(result) ? result : (result as { rows?: { count: number }[] })?.rows
  if (!rows?.length) throw new Error('View count unavailable')
  return Number(rows[0].count)
}

export async function recordNoteView(db: ViewDB, noteId: number, visitorHash: string) {
  // Unique key handles reloads, multiple tabs, retries, and concurrent serverless requests.
  await db.execute(sql`
    INSERT INTO note_views (note_id, visitor_hash) VALUES (${noteId}, ${visitorHash})
    ON CONFLICT (note_id, visitor_hash, viewed_on) DO NOTHING
  `)
  return getNoteViewCount(db, noteId)
}

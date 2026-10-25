import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'

type StatsDB = { execute: (query: SQL) => Promise<unknown> }

// Copies view and like totals onto notes so the admin list can sort by them.
// The like target format matches getNoteLikeTargetId in moduleLikes.ts.
export async function syncNoteStats(db: StatsDB) {
  await db.execute(sql`
    UPDATE notes AS n SET views = s.views, likes = s.likes
    FROM (
      SELECT
        notes.id,
        (SELECT count(*) FROM note_views WHERE note_views.note_id = notes.id)::int AS views,
        (SELECT COALESCE(SUM(like_count), 0) FROM module_likes
          WHERE target_id = 'note:' || notes.slug || ':note:' || notes.slug)::int AS likes
      FROM notes
    ) AS s
    WHERE n.id = s.id AND (n.views IS DISTINCT FROM s.views OR n.likes IS DISTINCT FROM s.likes)
  `)
  // Draft-aware list queries read the latest version rows, so mirror the totals there.
  await db.execute(sql`
    UPDATE _notes_v AS v SET version_views = n.views, version_likes = n.likes
    FROM notes AS n
    WHERE v.parent_id = n.id AND v.latest
      AND (v.version_views IS DISTINCT FROM n.views OR v.version_likes IS DISTINCT FROM n.likes)
  `)
}

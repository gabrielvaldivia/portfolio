import { createHash } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'
import { makeHighlightAnchor, resolveHighlightAnchor, type HighlightAnchor, type HighlightAttribution, type PublicHighlight } from './noteHighlightAnchors'

export type HighlightDB = { execute: (query: SQL) => Promise<unknown> }
type StoredHighlight = {
  anchor_key: string; quote: string; prefix: string; suffix: string
  start_offset: number; end_offset: number
  readers: (HighlightAttribution & { visitorHash: string })[]
}
type ResolvedHighlight = Omit<PublicHighlight, 'attributions'> & { keys: string[]; readers: Map<string, HighlightAttribution> }

export class HighlightError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export function highlightTextVersion(text: string) {
  return createHash('sha256').update(text).digest('hex')
}

function rows<T>(result: unknown): T[] {
  return Array.isArray(result) ? result : (result as { rows?: T[] })?.rows || []
}

export async function loadHighlightGroups(db: HighlightDB, noteId: number, text: string, visitorHash: string) {
  const result = await db.execute(sql`
    SELECT anchor_key, quote, prefix, suffix, start_offset, end_offset,
      jsonb_agg(jsonb_build_object('visitorHash', visitor_hash, 'location', location, 'createdAt', created_at)) AS readers
    FROM note_highlights WHERE note_id = ${noteId}
    GROUP BY anchor_key, quote, prefix, suffix, start_offset, end_offset
  `)
  const groups = new Map<string, ResolvedHighlight>()
  for (const row of rows<StoredHighlight>(result)) {
    const anchor = resolveHighlightAnchor(text, {
      exact: row.quote, prefix: row.prefix, suffix: row.suffix,
      start: row.start_offset, end: row.end_offset,
    })
    if (!anchor) continue // Deleted/ambiguous passages must never mark unrelated text.
    const id = `${anchor.start}:${anchor.end}`
    const group = groups.get(id) || { ...anchor, id, count: 0, mine: false, readers: new Map<string, HighlightAttribution>(), keys: [] }
    row.readers.forEach((reader) => {
      const attribution = { location: reader.location || null, createdAt: new Date(reader.createdAt).toISOString() }
      const previous = group.readers.get(reader.visitorHash)
      // If old anchors converge after an edit, each reader still counts once,
      // using their first saved attribution rather than a later duplicate.
      if (!previous || attribution.createdAt < previous.createdAt) group.readers.set(reader.visitorHash, attribution)
    })
    group.count = group.readers.size
    group.mine = group.readers.has(visitorHash)
    group.keys.push(row.anchor_key)
    groups.set(id, group)
  }
  return [...groups.values()].sort((a, b) => a.start - b.start || a.end - b.end)
}

export async function loadPublicHighlights(db: HighlightDB, noteId: number, text: string, visitorHash: string) {
  const groups = await loadHighlightGroups(db, noteId, text, visitorHash)
  // Explicit allowlist: never send anonymous reader identities or ownership keys to clients.
  return groups.map(({ id, exact, prefix, suffix, start, end, count, mine, readers }): PublicHighlight =>
    ({ id, exact, prefix, suffix, start, end, count, mine,
      attributions: [...readers.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }))
}

export async function writeHighlight(
  db: HighlightDB, noteId: number, text: string, visitorHash: string,
  input: HighlightAnchor, remove: boolean, location: string | null = null,
) {
  // The API checks the document version; do not accept a fabricated quote or position.
  if (text.slice(input.start, input.end) !== input.exact) {
    throw new HighlightError('This passage changed. Refresh the note and select it again.', 409)
  }
  const anchor = makeHighlightAnchor(text, input.start, input.end)
  const groups = await loadHighlightGroups(db, noteId, text, visitorHash)
  const existing = groups.find((group) => group.start === anchor.start && group.end === anchor.end)
  if (remove) {
    if (existing) await db.execute(sql`
      DELETE FROM note_highlights WHERE note_id = ${noteId} AND visitor_hash = ${visitorHash}
        AND anchor_key IN (${sql.join(existing.keys.map((key) => sql`${key}`), sql`, `)})
    `)
    return
  }
  if (existing?.mine) return // Idempotent, including two requests arriving at once.
  if (!existing && groups.length >= 500) throw new HighlightError('This note has reached its highlight limit.', 429)
  const key = existing?.keys[0] || highlightTextVersion(`${anchor.start}:${anchor.end}:${anchor.exact}`)
  const result = await db.execute(sql`
    INSERT INTO note_highlights (note_id, anchor_key, visitor_hash, quote, prefix, suffix, start_offset, end_offset, location)
    SELECT ${noteId}, ${key}, ${visitorHash}, ${anchor.exact}, ${anchor.prefix}, ${anchor.suffix}, ${anchor.start}, ${anchor.end}, ${location?.slice(0, 180) || null}
    WHERE (SELECT count(*) FROM note_highlights WHERE note_id = ${noteId} AND visitor_hash = ${visitorHash}) < 50
    ON CONFLICT (note_id, anchor_key, visitor_hash) DO NOTHING
    RETURNING anchor_key
  `)
  if (!rows(result).length) {
    const latest = await loadHighlightGroups(db, noteId, text, visitorHash)
    if (!latest.some((group) => group.start === anchor.start && group.end === anchor.end && group.mine)) {
      throw new HighlightError('You can save up to 50 passages per note. Remove one to highlight another.', 429)
    }
  }
}

/** Shared Postgres counters work across serverless instances; no raw IP addresses are stored. */
export async function checkHighlightRateLimit(db: HighlightDB, identities: string[], secret: string, now = Date.now()) {
  const hour = Math.floor(now / 3_600_000) * 3_600_000
  const keys = identities.map((identity) => highlightTextVersion(`${secret}:note-highlights:${identity}:${hour}`))
  const result = await db.execute(sql`
    WITH cleanup AS (
      DELETE FROM note_highlight_rate_limits WHERE window_started_at < now() - interval '2 hours'
    )
    INSERT INTO note_highlight_rate_limits (key_hash, window_started_at, request_count)
    VALUES ${sql.join(keys.map((key) => sql`(${key}, ${new Date(hour).toISOString()}::timestamptz, 1)`), sql`, `)}
    ON CONFLICT (key_hash) DO UPDATE SET request_count = note_highlight_rate_limits.request_count + 1
      WHERE note_highlight_rate_limits.request_count < 120
    RETURNING key_hash
  `)
  return rows(result).length === keys.length
}

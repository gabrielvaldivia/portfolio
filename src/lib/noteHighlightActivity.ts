import { sql } from '@payloadcms/db-postgres'
import { getNoteHighlightText, parseHighlightAnchor, resolveHighlightAnchor } from './noteHighlightAnchors'

export type HighlightActivityData = {
  anchor: unknown
  body: unknown
  title: string
  slug: string
  locations?: (string | null)[]
}

export type HighlightActivityLocation = { location: string; count: number }

// Read the saved highlights directly, including those created before activity
// support. One entry per passage; reader identities never leave the database.
export const noteHighlightActivityRows = sql`
  SELECT
    'highlight:' || h.note_id::text || ':' || h.anchor_key AS activity_id,
    'highlight'::text AS event_type,
    h.note_id AS entity_id,
    'note:' || n.slug || ':note:' || n.slug AS target_id,
    h.reader_count AS amount,
    NULL::varchar AS location,
    NULL::varchar AS city,
    NULL::varchar AS region,
    NULL::varchar AS country,
    NULL::numeric AS latitude,
    NULL::numeric AS longitude,
    h.activity_at,
    jsonb_build_object(
      'anchor', jsonb_build_object(
        'exact', h.quote, 'prefix', h.prefix, 'suffix', h.suffix,
        'start', h.start_offset, 'end', h.end_offset
      ),
      'body', n.body, 'title', n.title, 'slug', n.slug, 'locations', h.locations
    ) AS highlight
  FROM (
    SELECT note_id, anchor_key, quote, prefix, suffix, start_offset, end_offset,
      count(*)::integer AS reader_count,
      jsonb_agg(location ORDER BY created_at DESC, location) AS locations,
      date_trunc('milliseconds', max(created_at)) AS activity_at
    FROM note_highlights
    GROUP BY note_id, anchor_key, quote, prefix, suffix, start_offset, end_offset
  ) h
  JOIN notes n ON n.id = h.note_id
  WHERE n._status = 'published'
`

export function resolveHighlightActivity(data: HighlightActivityData | null) {
  if (!data) return null
  const anchor = parseHighlightAnchor(data.anchor)
  if (!anchor || !resolveHighlightAnchor(getNoteHighlightText(data.body), anchor)) return null
  const locations = new Map<string, HighlightActivityLocation>()
  for (const value of data.locations || []) {
    const location = typeof value === 'string' ? value.trim().slice(0, 180) : ''
    const group = locations.get(location) || { location, count: 0 }
    group.count++
    locations.set(location, group)
  }
  // Do not publish quotes removed from the current note or the note body itself.
  return { quote: anchor.exact, title: data.title, href: `/notes/${data.slug}`, locations: [...locations.values()] }
}

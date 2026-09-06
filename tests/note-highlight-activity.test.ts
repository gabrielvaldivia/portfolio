import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from '@payloadcms/db-postgres'
import { up } from '../src/migrations/20260906_120000_add_note_highlights'
import { up as addLocations } from '../src/migrations/20260906_180000_add_highlight_locations'
import { makeHighlightAnchor } from '../src/lib/noteHighlightAnchors'
import { writeHighlight } from '../src/lib/noteHighlightStore'
import { noteHighlightActivityRows, resolveHighlightActivity, type HighlightActivityData } from '../src/lib/noteHighlightActivity'
import { normalizeActivityCursor } from '../src/lib/moduleLikeActivityPagination'

const client = new PGlite()
const db = drizzle(client)
const text = 'One highlighted passage. A second highlighted passage.'
const anchor = makeHighlightAnchor(text, 0, 24)
const second = makeHighlightAnchor(text, 25, text.length)
const body = (value: string) => ({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: value }] }] } })
type ActivityRow = {
  activity_id: string; activity_at: Date; event_type: string; amount: number
  highlight: HighlightActivityData
}
const load = async () => (await db.execute(noteHighlightActivityRows)).rows as ActivityRow[]

before(async () => {
  await client.exec('CREATE TABLE notes (id integer PRIMARY KEY, title text, slug text, body jsonb, _status text);')
  await up({ db: { execute: (query: Parameters<typeof db.execute>[0]) => client.exec(new PgDialect().sqlToQuery(query as ReturnType<typeof sql>).sql) } } as unknown as Parameters<typeof up>[0])
  await addLocations({ db } as unknown as Parameters<typeof addLocations>[0])
  for (const id of [1, 2, 3, 4]) {
    await db.execute(sql`INSERT INTO notes VALUES (${id}, ${`Note ${id}`}, ${`note-${id}`}, ${JSON.stringify(body(text))}::jsonb, ${id === 2 ? 'draft' : 'published'})`)
    await writeHighlight(db, id, text, 'private-reader-one', anchor, false)
  }
  await writeHighlight(db, 1, text, 'private-reader-one', anchor, false)
  await writeHighlight(db, 1, text, 'private-reader-two', anchor, false)
  await writeHighlight(db, 1, text, 'private-reader-one', second, false)
  await db.execute(sql`UPDATE note_highlights SET created_at = '2026-09-01T12:00:00.123456Z'`)
})
after(async () => { await client.close() })

test('includes pre-existing saved quotes, grouped per passage, with no reader identities', async () => {
  const rows = await load()
  const first = rows.find(row => row.activity_id.startsWith('highlight:1:') && row.highlight.anchor && (row.highlight.anchor as {exact: string}).exact === anchor.exact)!
  assert.equal(first.amount, 2)
  assert.equal(rows.filter(row => row.activity_id.startsWith('highlight:1:')).length, 2)
  assert.deepEqual(resolveHighlightActivity(first.highlight), {quote: anchor.exact, title: 'Note 1', href: '/notes/note-1', locations: [{location: '', count: 2}]})
  assert.equal(JSON.stringify(rows).includes('private-reader'), false)
  assert.equal(JSON.stringify(resolveHighlightActivity(first.highlight)).includes('body'), false)
})

test('retains each location and unknown reader without assigning all readers to the latest city', async () => {
  await writeHighlight(db, 4, text, 'private-reader-spain', anchor, false, 'Mislata, Spain')
  await writeHighlight(db, 4, text, 'private-reader-new-york', anchor, false, 'Newburgh, NY')
  await writeHighlight(db, 4, text, 'private-reader-spain-two', anchor, false, 'Mislata, Spain')
  let row = (await load()).find(row => row.activity_id.startsWith('highlight:4:'))!
  const locations = resolveHighlightActivity(row.highlight)!.locations
  assert.equal(row.amount, 4)
  assert.deepEqual(locations.find(group => group.location === 'Mislata, Spain'), {location: 'Mislata, Spain', count: 2})
  assert.deepEqual(locations.find(group => group.location === 'Newburgh, NY'), {location: 'Newburgh, NY', count: 1})
  assert.deepEqual(locations.find(group => !group.location), {location: '', count: 1})
  assert.equal(JSON.stringify(row).includes('private-reader'), false)
  await writeHighlight(db, 4, text, 'private-reader-new-york', anchor, true)
  row = (await load()).find(row => row.activity_id.startsWith('highlight:4:'))!
  assert.equal(resolveHighlightActivity(row.highlight)!.locations.some(group => group.location === 'Newburgh, NY'), false)
})

test('excludes unpublished notes and quotes removed from the published text', async () => {
  assert.equal((await load()).some(row => row.activity_id.startsWith('highlight:2:')), false)
  await db.execute(sql`UPDATE notes SET body = ${JSON.stringify(body('This note has been rewritten.'))}::jsonb WHERE id = 3`)
  const stale = (await load()).find(row => row.activity_id.startsWith('highlight:3:'))!
  assert.equal(resolveHighlightActivity(stale.highlight), null)
})

test('keeps highlights valid after an introduction is added', async () => {
  await db.execute(sql`UPDATE notes SET body = ${JSON.stringify(body(`A new introduction. ${text}`))}::jsonb WHERE id = 1`)
  const rows = (await load()).filter(row => row.activity_id.startsWith('highlight:1:'))
  assert.ok(rows.every(row => resolveHighlightActivity(row.highlight)))
})

test('paginates highlights, likes and chats with equal timestamps without skipping or repeating IDs', async () => {
  const mixed = sql`
    WITH activity_rows AS (
      SELECT activity_id, activity_at FROM (${noteHighlightActivityRows}) highlights
      UNION ALL SELECT 'like:1', '2026-09-01T12:00:00.123Z'::timestamptz
      UNION ALL SELECT 'chat:1', '2026-09-01T12:00:00.123Z'::timestamptz
    )
  `
  const all = (await db.execute(sql`${mixed} SELECT * FROM activity_rows ORDER BY activity_at DESC, activity_id DESC`)).rows as ActivityRow[]
  const seen: string[] = []
  let cursor: ReturnType<typeof normalizeActivityCursor> = null
  for (let i = 0; i <= all.length; i++) {
    const where = cursor ? sql`WHERE (activity_at, activity_id) < (${cursor.createdAt}, ${cursor.id})` : sql``
    const [row] = (await db.execute(sql`${mixed} SELECT * FROM activity_rows ${where} ORDER BY activity_at DESC, activity_id DESC LIMIT 1`)).rows as ActivityRow[]
    if (!row) break
    seen.push(row.activity_id)
    cursor = normalizeActivityCursor({createdAt: new Date(row.activity_at).toISOString(), id: row.activity_id})
    assert.ok(cursor)
  }
  assert.deepEqual(seen, all.map(row => row.activity_id))
  assert.equal(new Set(seen).size, seen.length)
  assert.equal(normalizeActivityCursor({createdAt: 'not a date', id: 'like:1'}), null)
  assert.equal(normalizeActivityCursor({createdAt: new Date().toISOString(), id: 'highlight:1:invalid'}), null)
})

test('uses the latest reader timestamp and removes activity when the last highlight is removed', async () => {
  await db.execute(sql`UPDATE note_highlights SET created_at = '2026-09-02T12:00:00Z' WHERE note_id = 1 AND visitor_hash = 'private-reader-two'`)
  let first = (await load()).find(row => row.amount === 2)!
  assert.equal(new Date(first.activity_at).toISOString(), '2026-09-02T12:00:00.000Z')
  const id = first.activity_id
  await writeHighlight(db, 1, text, 'private-reader-two', anchor, true)
  first = (await load()).find(row => row.activity_id === id)!
  assert.equal(first.amount, 1)
  await writeHighlight(db, 1, text, 'private-reader-one', anchor, true)
  assert.equal((await load()).some(row => row.activity_id === id), false)
})

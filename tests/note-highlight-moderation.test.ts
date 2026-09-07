import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from '@payloadcms/db-postgres'
import { up as addHighlights } from '../src/migrations/20260906_120000_add_note_highlights'
import { up as addLocations } from '../src/migrations/20260906_180000_add_highlight_locations'
import { up as addModeration } from '../src/migrations/20260907_120000_add_highlight_moderation'
import { makeHighlightAnchor } from '../src/lib/noteHighlightAnchors'
import { highlightCoverage } from '../src/lib/noteHighlightLimits'
import { highlightTextVersion, isHighlightingPaused, loadPublicHighlights, writeHighlight } from '../src/lib/noteHighlightStore'
import { loadHighlightModeration, moderateHighlights, parseHighlightModerationAction, requireHighlightModerator } from '../src/lib/noteHighlightModeration'
import { checkHighlightOrigin, readHighlightJSON } from '../src/lib/noteHighlightRequest'
import { noteHighlightActivityRows } from '../src/lib/noteHighlightActivity'

const client = new PGlite()
const db = drizzle(client)
// Unique, single UTF-16-unit characters make exact 15% boundary tests unambiguous.
const text = Array.from({ length: 1000 }, (_, i) => String.fromCharCode(0x4e00 + i)).join('')
const reader = highlightTextVersion('reader-one')
const other = highlightTextVersion('reader-two')
const anchor = (start: number, end: number) => makeHighlightAnchor(text, start, end)
const save = (note: number, start: number, end: number, visitor = reader) => writeHighlight(db, note, text, visitor, anchor(start, end), false, 'Newburgh, NY')
const marks = (note: number) => loadPublicHighlights(db, note, text, reader)

before(async () => {
  await client.exec(`CREATE TABLE notes (id integer PRIMARY KEY, title text, slug text, body jsonb, _status text);
    INSERT INTO notes (id, title, slug, _status) SELECT n, 'Test note', 'note-' || n, 'published' FROM generate_series(1, 20) n;`)
  const migrationDB = { execute: (query: Parameters<typeof db.execute>[0]) => client.exec(new PgDialect().sqlToQuery(query as ReturnType<typeof sql>).sql) }
  await addHighlights({ db: migrationDB } as unknown as Parameters<typeof addHighlights>[0])
  await addLocations({ db } as unknown as Parameters<typeof addLocations>[0])
  await addModeration({ db: migrationDB } as unknown as Parameters<typeof addModeration>[0])
  await addModeration({ db: migrationDB } as unknown as Parameters<typeof addModeration>[0])
})
after(async () => { await client.close() })

test('counts union coverage, including nesting, touching ranges and disjoint spans', () => {
  const ranges = [{ start: 20, end: 40 }, { start: 0, end: 25 }, { start: 5, end: 8 }, { start: 40, end: 50 }, { start: 60, end: 65 }]
  assert.equal(highlightCoverage(ranges), 55)
  assert.equal(ranges[0].start, 20, 'does not mutate the caller’s array')
  assert.equal(highlightCoverage([]), 0)
})

test('accepts exactly 15%, rejects one character more and whole-note highlighting', async () => {
  await save(1, 0, 150)
  await assert.rejects(save(1, 100, 151), { status: 429 })
  await assert.rejects(save(2, 0, 1000), { status: 429 })
  assert.equal((await marks(2)).length, 0)
  await save(1, 20, 100) // Nested text does not consume additional coverage.
  assert.equal((await marks(1)).length, 2)
  await writeHighlight(db, 1, text, reader, anchor(0, 150), true)
  await save(1, 100, 151)
})

test('counts existing passages joined by a reader toward that reader’s limit', async () => {
  for (let i = 0; i < 5; i++) await save(3, i * 20, i * 20 + 10)
  await save(3, 200, 210, other)
  await assert.rejects(save(3, 200, 210), { status: 429 })
  assert.equal((await marks(3)).find(mark => mark.start === 200)?.mine, false)
})

test('concurrent distinct requests cannot exceed five passages or 15% coverage', async () => {
  const countResults = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => save(4, i * 15, i * 15 + 10)))
  assert.equal(countResults.filter(result => result.status === 'fulfilled').length, 5)
  assert.equal((await marks(4)).length, 5)
  const coverageResults = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => save(5, i * 80, i * 80 + 80)))
  assert.equal(coverageResults.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(highlightCoverage(await marks(5)), 80)
})

test('preserves over-quota legacy highlights and idempotent retries; always allows owner removal', async () => {
  const a = anchor(0, 200)
  await db.execute(sql`INSERT INTO note_highlights (note_id, anchor_key, visitor_hash, quote, prefix, suffix, start_offset, end_offset)
    VALUES (6, ${highlightTextVersion('legacy')}, ${reader}, ${a.exact}, ${a.prefix}, ${a.suffix}, ${a.start}, ${a.end})`)
  await save(6, 0, 200)
  assert.equal((await marks(6)).length, 1)
  await assert.rejects(save(6, 10, 20), { status: 429 })
  await writeHighlight(db, 6, text, reader, a, true)
  await save(6, 10, 20)
})

test('recomputes coverage against edited note length and ignores deleted anchors', async () => {
  await save(7, 0, 140)
  const shorter = text.slice(0, 500)
  await assert.rejects(writeHighlight(db, 7, shorter, reader, makeHighlightAnchor(shorter, 200, 210), false), { status: 429 })
  const rewritten = text.slice(500)
  await writeHighlight(db, 7, rewritten, reader, makeHighlightAnchor(rewritten, 0, 10), false)
  assert.equal((await loadPublicHighlights(db, 7, rewritten, reader)).length, 1)
})

test('pause is reversible, note-scoped, preserves marks and permits owner deletion', async () => {
  await save(8, 0, 10)
  const paused = await moderateHighlights(db, 8, text, { action: 'pause', paused: true })
  assert.equal(paused.paused, true)
  assert.equal((await marks(8)).length, 1)
  await assert.rejects(save(8, 20, 30), { status: 403 })
  await assert.rejects(save(8, 0, 10, other), { status: 403 })
  await writeHighlight(db, 8, text, reader, anchor(0, 10), true)
  await save(9, 0, 10)
  await moderateHighlights(db, 8, text, { action: 'pause', paused: false })
  assert.equal(await isHighlightingPaused(db, 8), false)
  await save(8, 20, 30)
})

test('passage moderation removes every reader and its Activity entry, not other passages', async () => {
  await save(10, 0, 10)
  await save(10, 0, 10, other)
  await save(10, 20, 30)
  const { passages } = await loadHighlightModeration(db, 10)
  const passage = passages.find(p => p.quote === anchor(0, 10).exact)!
  assert.equal(passage.readers.length, 2)
  await moderateHighlights(db, 10, text, { action: 'remove-passage', anchorKey: passage.key })
  assert.deepEqual((await marks(10)).map(mark => mark.start), [20])
  const activities = (await db.execute(noteHighlightActivityRows)).rows as { activity_id: string }[]
  assert.equal(activities.some(row => row.activity_id === `highlight:10:${passage.key}`), false)
})

test('remove-reader keeps other readers’ contributions and does not block future saves', async () => {
  await save(11, 0, 10)
  await save(11, 20, 30)
  await save(11, 0, 10, other)
  await moderateHighlights(db, 11, text, { action: 'remove-reader', readerId: reader })
  const [mark] = await marks(11)
  assert.equal(mark.count, 1)
  assert.equal(mark.mine, false)
  await save(11, 20, 30)
})

test('block removes all browser highlights on the note, preserves others, and can be undone', async () => {
  await save(12, 0, 10)
  await save(12, 20, 30)
  await save(12, 0, 10, other)
  await save(13, 0, 10)
  const blocked = await moderateHighlights(db, 12, text, { action: 'block-reader', readerId: reader })
  assert.equal(blocked.blockedReaders[0].location, 'Newburgh, NY')
  assert.equal((await marks(12))[0].count, 1)
  assert.equal((await marks(12))[0].mine, false)
  await assert.rejects(save(12, 20, 30), { status: 403 })
  assert.equal((await marks(13))[0].mine, true)
  await writeHighlight(db, 12, text, reader, anchor(0, 10), true)
  assert.equal((await marks(12))[0].count, 1, 'cannot remove another browser’s highlight')
  await moderateHighlights(db, 12, text, { action: 'unblock-reader', readerId: reader })
  assert.equal((await loadHighlightModeration(db, 12)).blockedReaders.length, 0)
  await save(12, 20, 30)
  assert.equal(JSON.stringify(await marks(12)).includes(reader), false)
})

test('moderation and concurrent writes serialize, so a block cannot be raced', async () => {
  await save(14, 0, 10)
  await Promise.allSettled([
    moderateHighlights(db, 14, text, { action: 'block-reader', readerId: reader }),
    ...Array.from({ length: 5 }, (_, i) => save(14, 20 + i * 20, 30 + i * 20)),
  ])
  assert.equal((await marks(14)).length, 0)
  await assert.rejects(save(14, 200, 210), { status: 403 })
})

test('rejects nonexistent notes and never creates dangling settings or blocks', async () => {
  await assert.rejects(save(999, 0, 10), { status: 404 })
  await assert.rejects(moderateHighlights(db, 999, text, { action: 'pause', paused: true }), { status: 404 })
})

test('moderation requires a CMS user and rejects malformed or unscoped actions', () => {
  for (const user of [null, undefined, {}, { collection: 'readers' }]) {
    assert.throws(() => requireHighlightModerator(user), { status: 401 })
  }
  requireHighlightModerator({ collection: 'users' })
  for (const action of [null, [], {}, { action: 'pause', paused: 'false' }, { action: 'delete-all' }, { action: 'remove-passage', anchorKey: '*' }, { action: 'block-reader', readerId: '' }]) {
    assert.throws(() => parseHighlightModerationAction(action), { status: 400 })
  }
  assert.deepEqual(parseHighlightModerationAction({ action: 'block-reader', readerId: reader }), { action: 'block-reader', readerId: reader })
})

test('rejects CSRF, absent moderation origin, non-JSON and oversized streamed requests', async () => {
  const url = 'https://portfolio.example/api/notes/highlights/moderation'
  checkHighlightOrigin(new Request(url, { headers: { Origin: 'https://portfolio.example' } }), true)
  const invalidOrigins: Record<string, string>[] = [{}, { Origin: 'https://attacker.example' }, { Origin: 'https://portfolio.example', 'Sec-Fetch-Site': 'cross-site' }]
  for (const headers of invalidOrigins) {
    assert.throws(() => checkHighlightOrigin(new Request(url, { headers }), true), { status: 403 })
  }
  await assert.rejects(readHighlightJSON(new Request(url, { method: 'POST', body: '{}' })), { status: 415 })
  const request = (body: string) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  for (const body of ['null', '[]', '{broken']) await assert.rejects(readHighlightJSON(request(body)), { status: 400 })
  await assert.rejects(readHighlightJSON(request(JSON.stringify({ value: 'x'.repeat(8192) }))), { status: 413 })
  assert.deepEqual(await readHighlightJSON(request('{"action":"pause","paused":true}')), { action: 'pause', paused: true })
})

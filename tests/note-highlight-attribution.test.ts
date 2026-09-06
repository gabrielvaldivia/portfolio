import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from '@payloadcms/db-postgres'
import { up } from '../src/migrations/20260906_120000_add_note_highlights'
import { up as addLocations } from '../src/migrations/20260906_180000_add_highlight_locations'
import { makeHighlightAnchor, type PublicHighlight } from '../src/lib/noteHighlightAnchors'
import { loadPublicHighlights, writeHighlight } from '../src/lib/noteHighlightStore'
import { getHighlightRequestLocation, getHighlightAttributionHeading, groupHighlightAttributions, formatHighlightDate } from '../src/lib/noteHighlightAttribution'

const client = new PGlite()
const db = drizzle(client)
const text = 'A highlighted passage about making things.'
const anchor = makeHighlightAnchor(text, 0, text.length)

before(async () => {
  await client.exec('CREATE TABLE notes (id integer PRIMARY KEY); INSERT INTO notes VALUES (1), (2), (3);')
  await up({ db: { execute: (query: Parameters<typeof db.execute>[0]) => client.exec(new PgDialect().sqlToQuery(query as ReturnType<typeof sql>).sql) } } as unknown as Parameters<typeof up>[0])
  // A real pre-migration shape, with no historical location to backfill.
  await db.execute(sql`INSERT INTO note_highlights VALUES (1, ${'a'.repeat(64)}, 'legacy-private-reader', ${anchor.exact}, '', '', 0, ${text.length}, '2026-09-06T12:34:56Z')`)
  await addLocations({ db } as unknown as Parameters<typeof addLocations>[0])
  await addLocations({ db } as unknown as Parameters<typeof addLocations>[0])
})
after(async () => { await client.close() })

test('uses only coarse Vercel geography, decoding and bounding labels', () => {
  const headers = new Headers({ 'x-vercel-ip-city': 'New%20York', 'x-vercel-ip-country-region': 'NY', 'x-vercel-ip-country': 'US' })
  assert.equal(getHighlightRequestLocation(headers), 'New York, NY')
  assert.equal(getHighlightRequestLocation(new Headers({ 'x-vercel-ip-city': 'S%C3%A3o+Paulo', 'x-vercel-ip-country': 'BR' })), 'São Paulo, Brazil')
  assert.equal(getHighlightRequestLocation(new Headers({ 'x-vercel-ip-country': 'GB' })), 'United Kingdom')
  assert.equal(getHighlightRequestLocation(new Headers({ 'x-forwarded-for': '8.8.8.8', 'cf-ipcity': 'Fake city' })), null)
  assert.equal(getHighlightRequestLocation(new Headers({ 'x-vercel-ip-city': '%broken', 'x-vercel-ip-country': 'XX' })), null)
  assert.equal(getHighlightRequestLocation(new Headers({ 'x-vercel-ip-city': 'a'.repeat(500) }))?.length, 80)
})

test('old highlights preserve their date and have an honest missing-location fallback', async () => {
  const [mark] = await loadPublicHighlights(db, 1, text, 'another-reader')
  assert.deepEqual(mark.attributions, [{ location: null, createdAt: '2026-09-06T12:34:56.000Z' }])
  assert.equal(getHighlightAttributionHeading(mark), 'Highlighted by someone')
  assert.equal(JSON.stringify(mark).includes('legacy-private-reader'), false)
})

test('keeps original attribution on retries and returns no visitor identities', async () => {
  await writeHighlight(db, 2, text, 'private-reader-a', anchor, false, 'Brooklyn, NY')
  const [first] = await loadPublicHighlights(db, 2, text, 'private-reader-a')
  await writeHighlight(db, 2, text, 'private-reader-a', anchor, false, 'London, United Kingdom')
  const [retried] = await loadPublicHighlights(db, 2, text, 'private-reader-a')
  assert.deepEqual(retried.attributions, first.attributions)
  assert.equal(getHighlightAttributionHeading(retried), 'Highlighted by someone from Brooklyn, NY')
  assert.equal(JSON.stringify(retried).includes('private-reader'), false)
  assert.deepEqual(Object.keys(retried.attributions[0]).sort(), ['createdAt', 'location'])
})

test('groups multiple people by location and minute, retaining dates for each contribution', async () => {
  await writeHighlight(db, 2, text, 'private-reader-b', anchor, false, 'Brooklyn, NY')
  await writeHighlight(db, 2, text, 'private-reader-c', anchor, false, 'London, United Kingdom')
  await db.execute(sql`UPDATE note_highlights SET created_at = '2026-09-06T13:42:00Z' WHERE note_id = 2`)
  const [mark] = await loadPublicHighlights(db, 2, text, 'unknown-reader')
  assert.equal(mark.count, 3)
  assert.equal(mark.attributions.length, 3)
  assert.equal(getHighlightAttributionHeading(mark), 'Highlighted by 3 people')
  const brooklyn = groupHighlightAttributions(mark.attributions).find(group => group.location === 'Brooklyn, NY')!
  assert.equal(brooklyn.count, 2)
  assert.deepEqual(brooklyn.dates, [{ createdAt: '2026-09-06T13:42:00.000Z', count: 2 }])
  const groups = groupHighlightAttributions([...mark.attributions, { location: null, createdAt: '2026-09-05T12:00:00.000Z' }])
  assert.equal(groups.find(group => !group.location)?.count, 1)
})

test('owner-only removal updates the public attribution list', async () => {
  await writeHighlight(db, 2, text, 'private-reader-b', anchor, true)
  const [mark] = await loadPublicHighlights(db, 2, text, 'private-reader-b')
  assert.equal(mark.count, 2)
  assert.equal(mark.mine, false)
  assert.equal(groupHighlightAttributions(mark.attributions).find(group => group.location === 'Brooklyn, NY')?.count, 1)
})

test('converging old anchors count a reader once and keep their first attribution', async () => {
  await writeHighlight(db, 3, text, 'same-private-reader', anchor, false, 'Paris, France')
  await db.execute(sql`UPDATE note_highlights SET created_at = '2026-09-05T12:00:00Z' WHERE note_id = 3`)
  await db.execute(sql`INSERT INTO note_highlights VALUES (3, ${'b'.repeat(64)}, 'same-private-reader', ${anchor.exact}, '', '', 0, ${text.length}, '2026-09-06T12:00:00Z', 'Brooklyn, NY')`)
  const [mark] = await loadPublicHighlights(db, 3, text, 'same-private-reader')
  assert.equal(mark.count, 1)
  assert.deepEqual(mark.attributions, [{ location: 'Paris, France', createdAt: '2026-09-05T12:00:00.000Z' }])
})

test('formats explicit date, year, local time and timezone', () => {
  const label = formatHighlightDate('2026-09-06T13:42:00Z', 'America/New_York')
  assert.ok(label.includes('Sep 6, 2026'))
  assert.ok(label.includes('9:42 AM EDT'))
  assert.equal(formatHighlightDate('invalid'), 'Date unavailable')
  assert.equal(getHighlightAttributionHeading({count: 2} as PublicHighlight), 'Highlighted by 2 people')
})

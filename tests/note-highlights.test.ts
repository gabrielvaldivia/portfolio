import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from '@payloadcms/db-postgres'
import { up } from '../src/migrations/20260906_120000_add_note_highlights'
import { up as addLocations } from '../src/migrations/20260906_180000_add_highlight_locations'
import { getNoteHighlightText, makeHighlightAnchor, normalizeHighlightText, parseHighlightAnchor, resolveHighlightAnchor } from '../src/lib/noteHighlightAnchors'
import { checkHighlightRateLimit, highlightTextVersion, loadPublicHighlights, writeHighlight } from '../src/lib/noteHighlightStore'

const client = new PGlite()
const db = drizzle(client)
const text = 'Before this passage. Software is an instrument. After this passage.'
const exact = 'Software is an instrument.'
const start = text.indexOf(exact)
const anchor = makeHighlightAnchor(text, start, start + exact.length)

before(async () => {
  await client.exec('CREATE TABLE notes (id integer PRIMARY KEY); INSERT INTO notes VALUES (1), (2), (3), (4);')
  await up({ db: { execute: (query: Parameters<typeof db.execute>[0]) => client.exec(new PgDialect().sqlToQuery(query as ReturnType<typeof sql>).sql) } } as unknown as Parameters<typeof up>[0])
  await addLocations({ db } as unknown as Parameters<typeof addLocations>[0])
})
after(async () => { await client.close() })

test('normalizes whitespace without changing punctuation, Unicode, or repeated text', () => {
  assert.equal(normalizeHighlightText('  A\n café —\u00a0two words.  '), 'A café — two words.')
  const unicode = 'I love 🪡 and café.'
  const a = makeHighlightAnchor(unicode, 7, unicode.length)
  assert.deepEqual(resolveHighlightAnchor(unicode, a), a)
})

test('extracts the same text as the renderer, including inline formatting but not image labels', () => {
  const node = { root: { children: [
    { type: 'paragraph', children: [{ type: 'text', text: 'One ' }, { type: 'link', fields: { url: 'https://example.com' }, children: [{ type: 'text', text: 'link.' }] }] },
    { type: 'paragraph', children: [{ type: 'link', fields: { url: 'https://substackcdn.com/image/test.jpg' }, children: [{ type: 'text', text: 'View image' }] }] },
    { type: 'heading', children: [{ type: 'text', text: 'Two' }] },
  ] } }
  assert.equal(getNoteHighlightText(node), 'One link.Two')
})

test('validates bounds, size, types, and whitespace', () => {
  assert.deepEqual(parseHighlightAnchor(anchor), anchor)
  for (const invalid of [null, {}, { ...anchor, start: -1 }, { ...anchor, end: 1 }, { ...anchor, exact: 'x'.repeat(1001) }, { ...anchor, prefix: 'x'.repeat(65) }, { ...anchor, exact: ' xx ' }, { ...anchor, start: '1' }]) {
    assert.equal(parseHighlightAnchor(invalid), null)
  }
})

test('reattaches when preceding paragraphs change and hides deleted text', () => {
  const edited = `An added introduction. ${text}`
  assert.equal(resolveHighlightAnchor(edited, anchor)?.start, start + 23)
  assert.equal(resolveHighlightAnchor(text.replace(exact, 'Changed completely.'), anchor), null)
})

test('uses surrounding context, never the old position alone, for repeated quotes', () => {
  const source = 'The first example says Hello world. A totally different example also says Hello world. End.'
  const offset = source.lastIndexOf('Hello world.')
  const a = makeHighlightAnchor(source, offset, offset + 12)
  const edited = `New introduction. ${source}`
  assert.equal(resolveHighlightAnchor(edited, a)?.start, edited.lastIndexOf('Hello world.'))
  assert.equal(resolveHighlightAnchor('Hello world. Hello world.', { exact: 'Hello world.', prefix: '', suffix: '', start: 0, end: 12 }), null)
})

test('persists public highlights, counts distinct readers, and supports owner-only removal', async () => {
  await writeHighlight(db, 1, text, 'reader-one', anchor, false)
  await writeHighlight(db, 1, text, 'reader-one', anchor, false)
  let marks = await loadPublicHighlights(db, 1, text, 'reader-two')
  assert.equal(marks[0].count, 1)
  assert.equal(marks[0].mine, false)
  assert.equal(JSON.stringify(marks).includes('reader-one'), false)
  await writeHighlight(db, 1, text, 'reader-two', anchor, true)
  assert.equal((await loadPublicHighlights(db, 1, text, 'reader-one'))[0].count, 1)
  await writeHighlight(db, 1, text, 'reader-two', anchor, false)
  marks = await loadPublicHighlights(db, 1, text, 'reader-one')
  assert.equal(marks[0].count, 2)
  assert.equal(marks[0].mine, true)
  await writeHighlight(db, 1, text, 'reader-one', anchor, true)
  marks = await loadPublicHighlights(db, 1, text, 'reader-one')
  assert.equal(marks[0].count, 1)
  assert.equal(marks[0].mine, false)
})

test('joins and removes the original highlight after an essay edit', async () => {
  const edited = `A new paragraph. ${text}`
  const moved = resolveHighlightAnchor(edited, anchor)!
  await writeHighlight(db, 1, edited, 'reader-three', moved, false)
  let marks = await loadPublicHighlights(db, 1, edited, 'reader-two')
  assert.equal(marks.length, 1)
  assert.equal(marks[0].count, 2)
  await writeHighlight(db, 1, edited, 'reader-two', moved, true)
  marks = await loadPublicHighlights(db, 1, edited, 'reader-three')
  assert.equal(marks.length, 1)
  assert.equal(marks[0].count, 1)
  assert.equal(marks[0].mine, true)
  assert.equal((await loadPublicHighlights(db, 1, edited.replace(exact, 'Removed'), 'reader-three')).length, 0)
})

test('rejects fabricated content and does not copy client-provided surrounding text', async () => {
  await assert.rejects(writeHighlight(db, 2, text, 'reader', { ...anchor, exact: 'fake' }, false), { status: 409 })
  await writeHighlight(db, 2, text, 'reader', { ...anchor, prefix: 'fake', suffix: 'fake' }, false)
  const [mark] = await loadPublicHighlights(db, 2, text, 'reader')
  assert.equal(mark.prefix, anchor.prefix)
  assert.equal(mark.suffix, anchor.suffix)
  assert.notEqual(highlightTextVersion(text), highlightTextVersion(`${text} edited`))
})

test('concurrent duplicate saves count once', async () => {
  await Promise.all(Array.from({ length: 8 }, () => writeHighlight(db, 3, text, 'reader', anchor, false)))
  const [mark] = await loadPublicHighlights(db, 3, text, 'reader')
  assert.equal(mark.count, 1)
})

test('limits highlights per reader per note without preventing removal', async () => {
  const body = Array.from({ length: 51 }, (_, i) => `Passage number ${i}.`).join(' ')
  for (let i = 0; i < 50; i++) {
    const quote = `Passage number ${i}.`
    const offset = body.indexOf(quote)
    await writeHighlight(db, 4, body, 'reader', makeHighlightAnchor(body, offset, offset + quote.length), false)
  }
  const offset = body.indexOf('Passage number 50.')
  const last = makeHighlightAnchor(body, offset, body.length)
  await assert.rejects(writeHighlight(db, 4, body, 'reader', last, false), { status: 429 })
  await writeHighlight(db, 4, body, 'reader', makeHighlightAnchor(body, 0, 'Passage number 0.'.length), true)
  await writeHighlight(db, 4, body, 'reader', last, false)
  assert.equal((await loadPublicHighlights(db, 4, body, 'reader')).length, 50)
})

test('enforces persistent limits even when an IP rotates its visitor cookie', async () => {
  for (let i = 0; i < 120; i++) assert.equal(await checkHighlightRateLimit(db, ['visitor:a', 'ip:one'], 'test-secret'), true)
  assert.equal(await checkHighlightRateLimit(db, ['visitor:b', 'ip:one'], 'test-secret'), false)
  assert.equal(await checkHighlightRateLimit(db, ['visitor:a', 'ip:two'], 'test-secret'), false)
  assert.equal(await checkHighlightRateLimit(db, ['visitor:c', 'ip:three'], 'test-secret'), true)
})

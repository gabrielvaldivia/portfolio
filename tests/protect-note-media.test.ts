import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { protectNoteMedia } from '../src/lib/protectNoteMedia'

const client = new PGlite()
const db = drizzle(client)
const upload = (value: unknown, relationTo = 'media') => ({ type: 'upload', relationTo, value })
const body = (...children: unknown[]) => ({ root: { type: 'root', children } })
const check = (id: number | string) => protectNoteMedia({
  id, req: { payload: { db: { drizzle: db } } },
} as unknown as Parameters<typeof protectNoteMedia>[0])

before(async () => {
  await client.exec(`
    CREATE TABLE notes (title text, body jsonb, cover_image_id integer, meta_image_id integer);
    CREATE TABLE _notes_v (version_title text, version_body jsonb,
      version_cover_image_id integer, version_meta_image_id integer, latest boolean);
  `)
})
beforeEach(async () => { await client.exec('TRUNCATE notes, _notes_v') })
after(async () => { await client.close() })

test('prevents deleting an inline image in a saved note, even when its latest draft removed it', async () => {
  await client.query('INSERT INTO notes VALUES ($1, $2, NULL, NULL)', ['Published note', body(upload(664))])
  await client.query('INSERT INTO _notes_v VALUES ($1, $2, NULL, NULL, true)', ['Draft', body()])
  await assert.rejects(check(664), { status: 409, message: /Published note/ })
})

test('protects nested and populated uploads in the latest draft', async () => {
  await client.query('INSERT INTO _notes_v VALUES ($1, $2, NULL, NULL, true)', [
    'Draft', body({ type: 'block', fields: { content: body(upload({ id: '665' })) } }),
  ])
  await assert.rejects(check(665), { status: 409, message: /Draft/ })
})

test('protects cover and social images in saved notes and latest drafts', async () => {
  await client.query('INSERT INTO notes VALUES ($1, NULL, 663, 664)', ['Published note'])
  await client.query('INSERT INTO _notes_v VALUES ($1, NULL, 665, 666, true)', ['Draft'])
  for (const id of [663, 664, 665, 666]) await assert.rejects(check(id), { status: 409 })
})

test('allows unused media, unrelated photo IDs, and images only in obsolete versions', async () => {
  await client.query('INSERT INTO notes VALUES ($1, $2, NULL, NULL)', [
    'Note', body(upload(664, 'photos'), upload(1664), upload(null), upload({}), { type: 'text', text: '664' }),
  ])
  await client.query('INSERT INTO _notes_v VALUES ($1, $2, 664, 664, false)', ['Old draft', body(upload(664))])
  await check(664)
})

test('allows deletion after references are removed from saved content and the latest draft', async () => {
  await client.query('INSERT INTO notes VALUES ($1, $2, NULL, NULL)', ['Note', body(upload(664))])
  await assert.rejects(check(664), { status: 409 })
  await client.query('UPDATE notes SET body = $1', [body()])
  await check(664)
})

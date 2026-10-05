import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import type { Payload } from 'payload'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { findGalleryPhotos } from '../src/lib/photoGallery'

const upload = (value: unknown, relationTo = 'photos') => ({ type: 'upload', relationTo, value })
const body = (...children: unknown[]) => ({ root: { type: 'root', children } })
const client = new PGlite()
const db = drizzle(client)
before(async () => { await client.exec('CREATE TABLE notes (body jsonb); CREATE TABLE _notes_v (version_body jsonb, latest boolean)') })
beforeEach(async () => { await client.exec('TRUNCATE notes, _notes_v') })
after(async () => { await client.close() })

async function fixture(savedBodies: unknown[], draftBodies: unknown[]) {
  for (const value of savedBodies) await client.query('INSERT INTO notes VALUES ($1::jsonb)', [JSON.stringify(value)])
  for (const value of draftBodies) await client.query('INSERT INTO _notes_v VALUES ($1::jsonb, true)', [JSON.stringify(value)])
  const calls: any[] = []
  const payload = {
    db: { drizzle: db },
    find: async (options: any) => {
      calls.push(options)
      assert.equal(options.collection, 'photos', 'gallery lookup must not download note bodies')
      return { docs: [] }
    },
  } as unknown as Pick<Payload, 'find' | 'db'>
  return { payload, calls }
}

test('excludes images in saved notes and latest drafts before the gallery limit is applied', async () => {
  const { payload, calls } = await fixture(
    [body(upload(39), { type: 'paragraph', children: [upload({ id: 40 })] })],
    [body(upload(41), upload(39))],
  )
  await findGalleryPhotos(payload)
  const photos = calls.find((call) => call.collection === 'photos')
  assert.deepEqual(new Set(photos.where.id.not_in), new Set([39, 40, 41]))
  assert.equal(photos.limit, 500)
  assert.equal(photos.sort, '-captureDate')
  assert.equal(calls.length, 1)
})

test('keeps gallery photos whose IDs only match Media uploads or ordinary note content', async () => {
  const { payload, calls } = await fixture([
    body(upload(39, 'media'), { type: 'text', text: 'photos/39' }, { type: 'relationship', relationTo: 'photos', value: 40 }),
  ], [null, body(upload(null), upload({}), upload(false))])
  await findGalleryPhotos(payload)
  assert.equal(calls.find((call) => call.collection === 'photos').where, undefined)
})

test('handles string upload IDs nested in rich-text blocks and empty notes', async () => {
  const { payload, calls } = await fixture([null, body({ type: 'block', fields: { content: body(upload('legacy-photo')) } })], [])
  await findGalleryPhotos(payload)
  assert.deepEqual(calls.find((call) => call.collection === 'photos').where.id.not_in, ['legacy-photo'])
})

test('obsolete autosaves do not hide unrelated gallery images', async () => {
  const { payload, calls } = await fixture([], [body(upload(41))])
  await client.query('INSERT INTO _notes_v VALUES ($1::jsonb, false)', [JSON.stringify(body(upload(42)))])
  await findGalleryPhotos(payload)
  assert.deepEqual(calls[0].where.id.not_in, [41])
})

import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { PayloadRequest, SanitizedCollectionConfig } from 'payload'
import { Notes } from '../src/collections/Notes'
import { up } from '../src/migrations/20260905_145858_add_notes_collection'

const client = new PGlite()
const populateSlug = Notes.hooks!.beforeValidate![0]
type NoteData = { title?: string | null; slug?: string | null }

async function prepareNote(data: NoteData, originalDoc?: NoteData) {
  return populateSlug({
    collection: Notes as SanitizedCollectionConfig,
    data,
    originalDoc,
    operation: originalDoc ? 'update' : 'create',
    context: {},
    req: {} as PayloadRequest,
  })
}

before(async () => {
  await client.exec('CREATE TABLE media (id integer PRIMARY KEY); CREATE TABLE payload_locked_documents_rels (id integer PRIMARY KEY);')
  await up({
    db: { execute: (query: SQL) => client.exec(new PgDialect().sqlToQuery(query).sql) },
  } as unknown as Parameters<typeof up>[0])
  await client.query('INSERT INTO notes (slug) VALUES ($1)', [''])
})
after(async () => { await client.close() })

test('creates multiple untitled drafts even when a legacy empty-slug draft exists', async () => {
  const drafts = await Promise.all([prepareNote({}), prepareNote({ title: '', slug: '' })])
  for (const draft of drafts) {
    await client.query('INSERT INTO notes (slug) VALUES ($1)', [draft.slug])
  }

  const { rows } = await client.query<{ slug: string | null }>('SELECT slug FROM notes ORDER BY id')
  assert.deepEqual(rows.map(({ slug }) => slug), ['', null, null])
})

test('generates a slug once the draft has a title and preserves explicit slugs', async () => {
  assert.equal((await prepareNote({ title: 'Café & independent work', slug: null })).slug, 'cafe-independent-work')
  assert.equal((await prepareNote({ title: 'New title', slug: 'custom-url' })).slug, 'custom-url')
  assert.equal((await prepareNote({ slug: '' }, { title: 'Existing title' })).slug, 'existing-title')
  assert.equal((await prepareNote({ title: '   ' })).slug, null)
})

test('keeps real note URLs unique', async () => {
  const first = await prepareNote({ title: 'A unique note' })
  const duplicate = await prepareNote({ title: 'A unique note' })
  await client.query('INSERT INTO notes (slug) VALUES ($1)', [first.slug])
  await assert.rejects(client.query('INSERT INTO notes (slug) VALUES ($1)', [duplicate.slug]), { code: '23505' })
})

import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from '@payloadcms/db-postgres'
import { up } from '../src/migrations/20260906_160000_add_note_views'
import { getNoteViewCount, recordNoteView } from '../src/lib/noteViewStore'

const client = new PGlite()
const db = drizzle(client)

before(async () => {
  await client.exec('CREATE TABLE notes (id integer PRIMARY KEY); INSERT INTO notes VALUES (1), (2), (3), (4);')
  await up({ db: { execute: (query: Parameters<typeof db.execute>[0]) => client.exec(new PgDialect().sqlToQuery(query as ReturnType<typeof sql>).sql) } } as unknown as Parameters<typeof up>[0])
})
after(async () => { await client.close() })

test('starts at zero and counts a browser once per note per UTC day', async () => {
  assert.equal(await getNoteViewCount(db, 1), 0)
  assert.equal(await recordNoteView(db, 1, 'reader-one'), 1)
  assert.equal(await recordNoteView(db, 1, 'reader-one'), 1)
  assert.equal(await recordNoteView(db, 1, 'reader-two'), 2)
  assert.equal(await recordNoteView(db, 2, 'reader-one'), 1)
  assert.equal(await getNoteViewCount(db, 1), 2)
})

test('concurrent reloads and retries cannot inflate the count', async () => {
  await Promise.all(Array.from({ length: 12 }, () => recordNoteView(db, 3, 'same-browser')))
  assert.equal(await getNoteViewCount(db, 3), 1)
})

test('returning the next day counts a new view without losing earlier views', async () => {
  await db.execute(sql`INSERT INTO note_views (note_id, visitor_hash, viewed_on) VALUES (4, 'reader', (now() AT TIME ZONE 'UTC')::date - 1)`)
  assert.equal(await recordNoteView(db, 4, 'reader'), 2)
  assert.equal(await recordNoteView(db, 4, 'reader'), 2)
})

test('deleting a note removes its view records', async () => {
  await db.execute(sql`DELETE FROM notes WHERE id = 4`)
  assert.equal(await getNoteViewCount(db, 4), 0)
})

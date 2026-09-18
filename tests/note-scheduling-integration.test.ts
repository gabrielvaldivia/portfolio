import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { buildConfig, getPayload, type Payload } from 'payload'
import { postgresAdapter, type PostgresAdapter } from '@payloadcms/db-postgres'
import { publishScheduledNotes } from '../src/lib/notePublishing'

const { Notes } = await import('../src/collections/Notes')
const { NoteSubscribers } = await import('../src/collections/NoteSubscribers')
const client = new PGlite()
let payload: Payload
const future = '2099-04-01T14:30:00.000Z'
const body = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'A scheduled note.', version: 1 }], version: 1 }], direction: null, format: '', indent: 0, version: 1 } }

before(async () => {
  const config = await buildConfig({ secret: 'isolated-scheduling-test',
    admin: { disable: true }, typescript: { autoGenerate: false },
    collections: [Notes, NoteSubscribers, { slug: 'media', upload: true, fields: [] }],
    db: postgresAdapter({ pool: { connectionString: 'postgres://unused' }, push: false }),
  })
  payload = await getPayload({ config, disableDBConnect: true, disableOnInit: true, key: 'note-scheduling-test' })
  const adapter = payload.db as unknown as PostgresAdapter
  const kit = adapter.requireDrizzleKit()
  const empty = await kit.generateDrizzleJson({})
  const schema = await kit.generateDrizzleJson(adapter.schema)
  const statements = await kit.generateMigration(empty, schema)
  await client.exec(statements.join(';\n'))
  adapter.drizzle = drizzle(client, { schema: adapter.schema }) as unknown as PostgresAdapter['drizzle']
  adapter.resolveInitializing()
})
after(async () => { await client.close() })

test('Payload schedules, autosaves, reschedules, cancels, and publishes through its real versioned API', async () => {
  const created = await payload.create({ collection: 'notes', data: { title: 'Scheduling integration test', slug: 'scheduling-integration-test', body: body as any,
    _status: 'published', publishedAt: future }, depth: 0 })
  assert.equal(created._status, 'draft')
  assert.equal(created.scheduledFor, future)
  assert.equal((await payload.find({ collection: 'notes', overrideAccess: false, depth: 0 })).totalDocs, 0)
  assert.deepEqual(await publishScheduledNotes(payload), [])

  await payload.update({ collection: 'notes', id: created.id, draft: true, autosave: true,
    data: { title: 'An edited scheduled note', publishedAt: '2099-05-01T14:30:00Z', _status: 'draft' } })
  const saved = await payload.findByID({ collection: 'notes', id: created.id, draft: false })
  assert.equal(saved.scheduledFor, future)
  assert.equal(saved.title, 'Scheduling integration test')

  const rescheduled = await payload.update({ collection: 'notes', id: created.id,
    data: { _status: 'published', publishedAt: '2099-06-01T14:30:00Z' } })
  assert.equal(rescheduled._status, 'draft')
  assert.equal(new Date(rescheduled.scheduledFor!).toISOString(), '2099-06-01T14:30:00.000Z')
  await payload.update({ collection: 'notes', id: created.id, data: { _status: 'draft' }, unpublishAllLocales: true, context: { cancelNoteSchedule: true } })
  assert.equal((await payload.findByID({ collection: 'notes', id: created.id, draft: false })).scheduledFor, null)

  // Move the isolated database's schedule into the past to exercise the runner.
  await payload.update({ collection: 'notes', id: created.id, data: { _status: 'published', publishedAt: future } })
  await client.query('UPDATE notes SET scheduled_for=$1 WHERE id=$2', ['2020-01-01T09:00:00Z', created.id])
  const result = await publishScheduledNotes(payload)
  assert.deepEqual(result, [{ id: created.id, slug: created.slug }])
  const live = await payload.findByID({ collection: 'notes', id: created.id, draft: false, overrideAccess: false })
  assert.equal(live._status, 'published')
  assert.equal(live.title, 'An edited scheduled note')
  assert.equal(live.scheduledFor, null)
  assert.ok(live.firstPublishedAt)
  assert.ok(live.newsletterSentAt)
  assert.deepEqual(await publishScheduledNotes(payload), [])
})

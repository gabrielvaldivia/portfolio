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

test('publishing draft changes and republishing a note never emails subscribers again', async (t) => {
  const previousKey = process.env.RESEND_API_KEY
  const previousSecret = process.env.PAYLOAD_SECRET
  process.env.RESEND_API_KEY = 're_test_only'
  process.env.PAYLOAD_SECRET = 'isolated-publication-test'
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = previousKey
    if (previousSecret === undefined) delete process.env.PAYLOAD_SECRET
    else process.env.PAYLOAD_SECRET = previousSecret
  })
  const send = t.mock.method(globalThis, 'fetch', async (input: unknown) => {
    assert.equal(String(input), 'https://api.resend.com/emails/batch')
    return Response.json({ data: [{ id: 'test-email' }] })
  })
  await payload.create({ collection: 'note-subscribers', data: { email: 'publication-test@example.test', status: 'subscribed' } })

  const created = await payload.create({ collection: 'notes', data: { title: 'Already published note',
    slug: 'already-published-note', body: body as any, _status: 'published', publishedAt: '2020-01-01T09:00:00Z' } })
  const firstPublication = await payload.findByID({ collection: 'notes', id: created.id, draft: false })
  assert.ok(firstPublication.firstPublishedAt)
  assert.ok(firstPublication.newsletterSentAt)
  assert.equal(send.mock.callCount(), 1)

  await payload.update({ collection: 'notes', id: created.id, draft: true, autosave: true,
    data: { title: 'Draft changes to a published note', _status: 'draft' } })
  const draft = await payload.findByID({ collection: 'notes', id: created.id, draft: true })
  const live = await payload.findByID({ collection: 'notes', id: created.id, draft: false })
  assert.equal(draft._status, 'draft')
  assert.equal(live._status, 'published')
  assert.equal(live.title, 'Already published note')
  assert.equal(send.mock.callCount(), 1)

  await payload.update({ collection: 'notes', id: created.id, data: { _status: 'published' } })
  const updated = await payload.findByID({ collection: 'notes', id: created.id, draft: false })
  assert.equal(updated.title, draft.title)
  assert.equal(updated.firstPublishedAt, firstPublication.firstPublishedAt)
  assert.equal(updated.newsletterSentAt, firstPublication.newsletterSentAt)
  assert.equal(send.mock.callCount(), 1)

  // Publication history also protects an unpublished note with no email receipt.
  await payload.update({ collection: 'notes', id: created.id, unpublishAllLocales: true,
    data: { _status: 'draft', newsletterSentAt: null } })
  const unpublished = await payload.findByID({ collection: 'notes', id: created.id, draft: false })
  assert.equal(unpublished._status, 'draft')
  assert.equal(unpublished.newsletterSentAt, null)
  await payload.update({ collection: 'notes', id: created.id, data: { _status: 'published' } })
  const republished = await payload.findByID({ collection: 'notes', id: created.id, draft: false })
  assert.equal(republished._status, 'published')
  assert.equal(republished.firstPublishedAt, firstPublication.firstPublishedAt)
  assert.equal(republished.newsletterSentAt, null)
  assert.equal(send.mock.callCount(), 1)
})

import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { Payload, PayloadRequest, SanitizedCollectionConfig } from 'payload'
import { isFuturePublishDate, prepareNotePublication, publishScheduledNotes } from '../src/lib/notePublishing'
import { up as notesMigration } from '../src/migrations/20260905_145858_add_notes_collection'
import { up as subscriptionMigration } from '../src/migrations/20260906_034551_add_note_subscribers_and_newsletter'
import { up as schedulingMigration } from '../src/migrations/20260918_020000_schedule_notes'

const { Notes } = await import('../src/collections/Notes')
const db = new PGlite()
const dialect = new PgDialect()
const execute = (query: SQL) => {
  const { sql, params } = dialect.sqlToQuery(query)
  return db.query(sql, params)
}
const future = '2099-04-01T14:30:00.000Z'
const past = '2020-04-01T14:30:00.000Z'
type Doc = Record<string, any>
let sent = 0
let failUpdate = false
let payload: Payload
const realFetch = globalThis.fetch
const previousKey = process.env.RESEND_API_KEY
const previousCronSecret = process.env.CRON_SECRET

async function findByID({ id }: { id: number | string }) {
  const { rows } = await db.query<Doc>('SELECT * FROM notes WHERE id = $1', [id])
  const row = rows[0]
  return { id: row.id, title: row.title, slug: row.slug, _status: row._status,
    publishedAt: row.published_at?.toISOString(), scheduledFor: row.scheduled_for?.toISOString() || null, firstPublishedAt: row.first_published_at?.toISOString(),
    newsletterSentAt: row.newsletter_sent_at, updatedAt: row.updated_at }
}
async function prepare(data: Doc, originalDoc?: Doc, context: Doc = {}, req?: PayloadRequest) {
  const request = req || { payload, context } as PayloadRequest
  return prepareNotePublication({ data, originalDoc, context, req: request,
    operation: originalDoc ? 'update' : 'create', collection: Notes as SanitizedCollectionConfig })
}

before(async () => {
  const migrate = async (up: typeof notesMigration) => up({ db: { execute: (q: SQL) => db.exec(dialect.sqlToQuery(q).sql) } } as any)
  await db.exec('CREATE TABLE media (id integer PRIMARY KEY); CREATE TABLE payload_locked_documents_rels (id integer PRIMARY KEY);')
  await migrate(notesMigration)
  await migrate(subscriptionMigration)
  await db.query('INSERT INTO notes (title, slug, _status, published_at) VALUES ($1, $2, $3, $4)', ['Old note', 'old-note', 'published', past])
  await migrate(schedulingMigration)
  const sessions: Record<string, { db: { execute: typeof execute } }> = {}
  payload = {
    config: {},
    db: {
      sessions,
      beginTransaction: async () => { await db.exec('BEGIN'); sessions.test = { db: { execute } }; return 'test' },
      commitTransaction: async () => { await db.exec('COMMIT'); delete sessions.test },
      rollbackTransaction: async () => { await db.exec('ROLLBACK'); delete sessions.test },
    },
    logger: { info: () => {}, error: () => {} },
    findByID,
    find: async () => ({ docs: [{ email: 'scheduler-test@example.test' }], hasNextPage: false }),
    update: async ({ id, data, context = {}, req }: any) => {
      if (failUpdate) throw new Error('Simulated database failure')
      const original = await findByID({ id })
      req ||= { payload, context }
      req.context = { ...req.context, ...context }
      const prepared = await prepare(data, original, req.context, req)
      const doc = { ...original, ...prepared }
      await db.query(`UPDATE notes SET _status=$2, published_at=$3, scheduled_for=$4,
        first_published_at=$5, newsletter_sent_at=$6 WHERE id=$1`,
      [id, doc._status, doc.publishedAt, doc.scheduledFor, doc.firstPublishedAt, doc.newsletterSentAt])
      await Notes.hooks!.afterChange![0]({ data, doc, previousDoc: original, context: req.context, req, operation: 'update',
        collection: Notes as SanitizedCollectionConfig })
      return doc
    },
  } as unknown as Payload
  process.env.RESEND_API_KEY = 're_test'
  globalThis.fetch = async (input) => {
    assert.match(String(input), /^https:\/\/api.resend.com\//)
    sent++
    return Response.json({ data: [{ id: 'test-email' }] })
  }
})
after(async () => {
  globalThis.fetch = realFetch
  if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey
  if (previousCronSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousCronSecret
  await db.close()
})

test('a future date alone remains an unscheduled draft; Publish explicitly schedules it', async () => {
  const draft = await prepare({ _status: 'draft', publishedAt: future })
  assert.equal(draft.scheduledFor, null)
  const scheduled = await prepare({ _status: 'published', publishedAt: future })
  assert.equal(scheduled._status, 'draft')
  assert.equal(scheduled.scheduledFor, future)
  assert.equal(scheduled.firstPublishedAt, null)
  assert.equal(sent, 0)
})

test('date comparisons preserve timezone offsets and the exact due boundary', () => {
  assert.equal(isFuturePublishDate('2030-01-01T09:00:00-05:00', Date.parse('2030-01-01T13:59:59Z')), true)
  assert.equal(isFuturePublishDate('2030-01-01T09:00:00-05:00', Date.parse('2030-01-01T14:00:00Z')), false)
  assert.equal(isFuturePublishDate(null), false)
})

test('blank or past dates publish immediately and remember the first publication', async () => {
  for (const date of [null, past]) {
    const context: Doc = {}
    const doc = await prepare({ _status: 'published', publishedAt: date }, undefined, context)
    assert.equal(doc._status, 'published')
    assert.ok(doc.firstPublishedAt)
    assert.equal(doc.scheduledFor, null)
    assert.equal(context.firstNotePublication, true)
  }
})

test('migration preserves publication history and old posts do not email subscribers again', async () => {
  const old = await findByID({ id: 1 })
  assert.ok(old.firstPublishedAt)
  const context: Doc = {}
  await prepare({ _status: 'published' }, { ...old, _status: 'draft', firstPublishedAt: null }, context)
  assert.equal(context.firstNotePublication, false)
})

test('autosave cannot change a schedule; explicitly publishing can reschedule it or publish now', async () => {
  const { rows } = await db.query<{ id: number }>('INSERT INTO notes (slug, scheduled_for, published_at) VALUES ($1,$2,$2) RETURNING id', ['scheduled-note', future])
  const saved = await findByID({ id: rows[0].id })
  const otherDate = '2099-05-01T14:30:00Z'
  assert.equal((await prepare({ _status: 'draft', publishedAt: otherDate, scheduledFor: otherDate }, saved)).scheduledFor, future)
  assert.equal((await prepare({ _status: 'published', publishedAt: otherDate }, saved)).scheduledFor, otherDate)
  assert.equal((await prepare({ _status: 'published', publishedAt: null }, saved)).scheduledFor, null)
  assert.equal((await prepare({}, saved, { cancelNoteSchedule: true })).scheduledFor, null)
})

test('scheduler publishes only due drafts and sends one newsletter, even on repeated runs', async () => {
  const { rows } = await db.query<{ id: number }>('INSERT INTO notes (title,slug,scheduled_for,published_at) VALUES ($1,$2,$3,$3) RETURNING id', ['Scheduled test', 'due-note', past])
  const result = await publishScheduledNotes(payload)
  assert.deepEqual(result, [{ id: rows[0].id, slug: 'due-note' }])
  const published = await findByID({ id: rows[0].id })
  assert.equal(published._status, 'published')
  assert.equal(published.scheduledFor, null)
  assert.equal(published.publishedAt, past)
  assert.ok(published.newsletterSentAt)
  assert.equal(sent, 1)
  assert.deepEqual(await publishScheduledNotes(payload), [])
  assert.equal(sent, 1)
  const futureNote = (await db.query<Doc>('SELECT _status FROM notes WHERE slug=$1', ['scheduled-note'])).rows[0]
  assert.equal(futureNote._status, 'draft')
})

test('a failed publication rolls back and stays scheduled for a later retry', async () => {
  const { rows } = await db.query<{ id: number }>('INSERT INTO notes (title,slug,scheduled_for,published_at) VALUES ($1,$2,$3,$3) RETURNING id', ['Retry test', 'retry-note', past])
  failUpdate = true
  await assert.rejects(publishScheduledNotes(payload), /Simulated database failure/)
  const note = await findByID({ id: rows[0].id })
  assert.equal(note._status, 'draft')
  assert.equal(note.scheduledFor, past)
  failUpdate = false
  assert.equal((await publishScheduledNotes(payload)).length, 1)
  assert.equal(sent, 2)
})

test('schedule cancellation requires authentication', async () => {
  assert.ok(Notes.endpoints)
  const endpoint = Notes.endpoints.find((endpoint) => endpoint.path === '/:id/cancel-schedule')!
  assert.equal((await endpoint.handler({ user: null } as PayloadRequest)).status, 401)
})

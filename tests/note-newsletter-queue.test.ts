import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, mock, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { Payload } from 'payload'
import type { SQL } from 'drizzle-orm'
import { queuePublishedNoteNewsletter } from '../src/lib/noteNewsletter'
import { getNoteNewsletterStatus, processNoteNewsletterQueue } from '../src/lib/noteNewsletterQueue'
import { up } from '../src/migrations/20261002_120000_queue_note_newsletters'

const client = new PGlite()
const dialect = new PgDialect()
const db = { execute: async (query: SQL) => { const { sql, params } = dialect.sqlToQuery(query); return client.query(sql, params) } }
const env = { RESEND_API_KEY: 'test-only', PAYLOAD_SECRET: 'test-only', VERCEL_ENV: 'production' }
const originals = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
const note = { id: 1, title: 'First publication', slug: 'first-publication', updatedAt: '2026-10-02T12:00:00Z',
  body: { root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text: 'Original content', version: 1 }] }] } } }
const payload = {
  db: { drizzle: db },
  find: async ({ page, limit }: { page: number; limit: number }) => {
    const { rows } = await client.query('SELECT email FROM note_subscribers WHERE status=$1 ORDER BY id LIMIT $2 OFFSET $3', ['subscribed', limit, (page - 1) * limit])
    return { docs: rows, hasNextPage: rows.length === limit }
  },
  findByID: async () => note,
} as unknown as Payload
const run = (maxMessages = 120) => processNoteNewsletterQueue(db, { maxMessages, pause: async () => {} })
async function subscribers(count: number) {
  await client.query("INSERT INTO note_subscribers (email, status) SELECT 'reader-' || n || '@example.test', 'subscribed' FROM generate_series(1, $1::int) n", [count])
}
const sends = () => mock.method(globalThis, 'fetch', async (_url: unknown, options?: RequestInit) => {
  const key = new Headers(options?.headers).get('Idempotency-Key')
  return Response.json({ id: key })
})
async function dueAgain() {
  await client.exec("UPDATE note_newsletter_runner SET paused_until = now(), lease_until = now(); UPDATE note_newsletter_deliveries SET next_attempt_at = now();")
}

before(async () => {
  await client.exec('CREATE TABLE notes (id integer PRIMARY KEY, _status varchar, newsletter_sent_at timestamptz); CREATE TABLE note_subscribers (id serial PRIMARY KEY, email varchar UNIQUE, status varchar);')
  const migrationDB = { execute: (q: SQL) => client.exec(dialect.sqlToQuery(q).sql) }
  await up({ db: migrationDB } as any)
  await up({ db: migrationDB } as any)
})
beforeEach(async () => {
  Object.assign(process.env, env)
  await client.exec("TRUNCATE note_newsletter_daily_slots, note_newsletter_runner, note_newsletters, notes, note_subscribers CASCADE; INSERT INTO notes (id, _status) VALUES (1, 'published'), (2, 'published');")
})
afterEach(() => { mock.restoreAll(); for (const [key, value] of Object.entries(originals)) { if (value === undefined) delete process.env[key]; else process.env[key] = value } })
after(async () => { await client.close() })

test('publication freezes the subscriber snapshot and content without sending; repeat publication does not duplicate it', async () => {
  await subscribers(2)
  const send = sends()
  assert.deepEqual(await queuePublishedNoteNewsletter(note, payload), { queued: true, recipientCount: 2 })
  assert.deepEqual(await queuePublishedNoteNewsletter({ ...note, title: 'Edited later' }, payload), { queued: false, recipientCount: 0 })
  await client.exec("INSERT INTO note_subscribers (email, status) VALUES ('new-reader@example.test', 'subscribed')")
  assert.equal(send.mock.callCount(), 0)
  assert.equal((await getNoteNewsletterStatus(db, 1)).pending, 2)
  await run()
  assert.equal(send.mock.callCount(), 2)
  for (const call of send.mock.calls) assert.equal(JSON.parse(call.arguments[1]!.body as string).subject, note.title)
  assert.ok((await getNoteNewsletterStatus(db, 1)).completedAt)
})

test('caps all notes combined at 100, survives repeated runs, and resumes the remainder on the next UTC day', async () => {
  await subscribers(80)
  await queuePublishedNoteNewsletter(note, payload)
  await queuePublishedNoteNewsletter({ ...note, id: 2 }, payload)
  const send = sends()
  await run()
  await run()
  assert.equal(send.mock.callCount(), 100)
  assert.equal((await getNoteNewsletterStatus(db, 1)).usedToday, 100)
  assert.equal((await client.query<{ count: number }>("SELECT count(*)::int AS count FROM note_newsletter_deliveries WHERE status = 'pending'")).rows[0].count, 60)
  await client.exec("UPDATE note_newsletter_runner SET budget_day = budget_day - 1; UPDATE note_newsletter_daily_slots SET day = day - 1;")
  await run()
  assert.equal(send.mock.callCount(), 160)
  assert.equal((await getNoteNewsletterStatus(db, 2)).usedToday, 60)
  const keys = send.mock.calls.map(call => new Headers(call.arguments[1]!.headers).get('Idempotency-Key'))
  assert.equal(new Set(keys).size, 160)
})

test('overlapping jobs cannot double-send or consume more than the shared daily allowance', async () => {
  await subscribers(105)
  await queuePublishedNoteNewsletter(note, payload)
  const send = sends()
  const results = await Promise.all([run(), run(), run()])
  assert.equal(results.filter(result => result.status === 'paused').length, 2)
  assert.equal(send.mock.callCount(), 100)
  assert.equal((await getNoteNewsletterStatus(db, 1)).pending, 5)
})

test('a crash after reservation retains its quota slot and retries the exact message and key', async () => {
  await subscribers(1)
  await queuePublishedNoteNewsletter(note, payload)
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Lost response') })
  assert.equal((await run()).status, 'deferred')
  await dueAgain()
  send.mock.mockImplementation(async () => Response.json({ id: 'recovered' }))
  await run()
  assert.equal(send.mock.callCount(), 2)
  const [first, retry] = send.mock.calls.map(call => (call.arguments as unknown[])[1] as RequestInit)
  assert.equal(first.body, retry.body)
  assert.equal(new Headers(first.headers).get('Idempotency-Key'), new Headers(retry.headers).get('Idempotency-Key'))
  assert.equal((await getNoteNewsletterStatus(db, 1)).usedToday, 1)
  assert.equal((await getNoteNewsletterStatus(db, 1)).sent, 1)
})

test('unknown deliveries older than the provider deduplication window are held for review', async () => {
  await subscribers(1)
  await queuePublishedNoteNewsletter(note, payload)
  await client.exec("UPDATE note_newsletter_deliveries SET first_attempt_at = now() - interval '24 hours'")
  const send = sends()
  await run()
  assert.equal(send.mock.callCount(), 0)
  assert.equal((await getNoteNewsletterStatus(db, 1)).review, 1)
  assert.equal((await getNoteNewsletterStatus(db, 1)).completedAt, null)
})

test('unsubscribes and deletions are respected, and unpublished notes pause delivery', async () => {
  await subscribers(3)
  await queuePublishedNoteNewsletter(note, payload)
  await client.exec("UPDATE note_subscribers SET status='unsubscribed' WHERE email='reader-1@example.test'; DELETE FROM note_subscribers WHERE email='reader-2@example.test'; UPDATE notes SET _status='draft' WHERE id=1")
  const send = sends()
  await run()
  assert.equal(send.mock.callCount(), 0)
  assert.equal((await getNoteNewsletterStatus(db, 1)).skipped, 2)
  await client.exec("UPDATE notes SET _status='published' WHERE id=1")
  await run()
  assert.equal(send.mock.callCount(), 1)
})

test('provider account quota pauses every note until midnight UTC and preserves rejected recipients', async () => {
  await subscribers(2)
  await queuePublishedNoteNewsletter(note, payload)
  const send = mock.method(globalThis, 'fetch', async () => Response.json({ name: 'daily_quota_exceeded' }, { status: 429 }))
  assert.equal((await run()).status, 'deferred')
  assert.equal((await run()).status, 'paused')
  assert.equal(send.mock.callCount(), 1)
  const status = await getNoteNewsletterStatus(db, 1)
  assert.equal(status.pending, 2)
  assert.equal(status.lastError, 'daily_quota_exceeded')
  assert.equal(new Date(status.pausedUntil!).getUTCHours(), 0)
  assert.equal((await client.query<{ first_attempt_at: unknown }>('SELECT first_attempt_at FROM note_newsletter_deliveries LIMIT 1')).rows[0].first_attempt_at, null)
  await dueAgain()
  send.mock.mockImplementation(async () => Response.json({ id: 'accepted' }))
  await run()
  assert.equal((await getNoteNewsletterStatus(db, 1)).sent, 2)
})

test('no provider key leaves the queue intact; local and preview entries never enter the production queue', async () => {
  await subscribers(1)
  process.env.VERCEL_ENV = 'preview'
  await queuePublishedNoteNewsletter(note, payload)
  process.env.VERCEL_ENV = 'production'
  const send = sends()
  await run()
  assert.equal(send.mock.callCount(), 0)
  await queuePublishedNoteNewsletter(note, payload)
  delete process.env.RESEND_API_KEY
  assert.equal((await run()).status, 'unconfigured')
  assert.equal((await getNoteNewsletterStatus(db, 1)).pending, 1)
})

test('deleting a note never restores daily sending capacity', async () => {
  await subscribers(100)
  await queuePublishedNoteNewsletter(note, payload)
  const send = sends()
  await run()
  await client.exec('DELETE FROM notes WHERE id=1')
  await queuePublishedNoteNewsletter({ ...note, id: 2 }, payload)
  await run()
  assert.equal(send.mock.callCount(), 100)
  assert.equal((await getNoteNewsletterStatus(db, 2)).pending, 100)
})

test('queue rows and the publication roll back together when saving a recipient fails', async () => {
  await subscribers(1)
  await client.exec('BEGIN')
  await client.exec("UPDATE notes SET _status='draft' WHERE id=1")
  const broken = { ...payload, db: { drizzle: { execute: async (q: SQL) => {
    if (dialect.sqlToQuery(q).sql.includes('INSERT INTO note_newsletter_deliveries')) throw new Error('Storage unavailable')
    return db.execute(q)
  } } } } as unknown as Payload
  await assert.rejects(queuePublishedNoteNewsletter(note, broken), /Storage unavailable/)
  await client.exec('ROLLBACK')
  assert.equal((await getNoteNewsletterStatus(db, 1)).queued, false)
  assert.equal((await client.query<{ _status: string }>('SELECT _status FROM notes WHERE id=1')).rows[0]._status, 'published')
})

test('delivery route requires a configured scheduler secret and refuses preview execution', async () => {
  const { GET } = await import('../src/app/api/notes/send-newsletters/route')
  const secret = process.env.CRON_SECRET
  try {
    delete process.env.CRON_SECRET
    assert.equal((await GET(new Request('https://portfolio.example/api/notes/send-newsletters'))).status, 503)
    process.env.CRON_SECRET = 'test-scheduler-secret'
    assert.equal((await GET(new Request('https://portfolio.example/api/notes/send-newsletters'))).status, 401)
    process.env.VERCEL_ENV = 'preview'
    assert.equal((await GET(new Request('https://portfolio.example/api/notes/send-newsletters', { headers: { Authorization: 'Bearer test-scheduler-secret' } }))).status, 403)
  } finally {
    if (secret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = secret
  }
})

test('queue tables reject public database roles', async () => {
  await subscribers(1)
  await queuePublishedNoteNewsletter(note, payload)
  await client.exec('CREATE ROLE newsletter_public; GRANT USAGE ON SCHEMA public TO newsletter_public; GRANT SELECT ON note_newsletters, note_newsletter_deliveries, note_newsletter_daily_slots, note_newsletter_runner TO newsletter_public; SET ROLE newsletter_public;')
  try {
    const { rows } = await client.query('SELECT * FROM note_newsletter_deliveries')
    assert.equal(rows.length, 0)
  } finally { await client.exec('RESET ROLE') }
})

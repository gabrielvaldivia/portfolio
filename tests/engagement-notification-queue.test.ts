import assert from 'node:assert/strict'
import { after, afterEach, before, beforeEach, mock, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import { sql } from '@payloadcms/db-postgres'
import { up } from '../src/migrations/20260922_223000_queue_engagement_notifications'
import { engagementNotification } from '../src/lib/engagementAccess'
import { queueEngagementNotification, deliverNextEngagementNotification } from '../src/lib/engagementNotificationQueue'

Object.assign(process.env, { NODE_ENV: 'development', PAYLOAD_SECRET: 'queue-test-secret', RESEND_API_KEY: 're_test_only' })
const client = new PGlite()
const db = drizzle(client)
const notification = () => engagementNotification('reader@example.test')

before(async () => {
  const migrationDB = { execute: (query: Parameters<typeof db.execute>[0]) => client.exec(new PgDialect().sqlToQuery(query as ReturnType<typeof sql>).sql) }
  await up({ db: migrationDB } as unknown as Parameters<typeof up>[0])
  await up({ db: migrationDB } as unknown as Parameters<typeof up>[0])
})
beforeEach(async () => { await client.exec('DELETE FROM engagement_notifications') })
afterEach(() => mock.restoreAll())
after(async () => { await client.close() })

test('concurrent submissions persist one original message instead of losing the email or changing retries', async () => {
  const original = notification()
  await Promise.all(Array.from({ length: 5 }, () => queueEngagementNotification(db, original)))
  await queueEngagementNotification(db, { ...original, message: { ...original.message, text: 'Changed after deployment' } })
  const result = await client.query<{ message: unknown; sent_at: string | null }>('SELECT message, sent_at FROM engagement_notifications')
  assert.equal(result.rows.length, 1)
  assert.deepEqual(result.rows[0].message, original.message)
  assert.equal(result.rows[0].sent_at, null)
})

test('daily quota exhaustion preserves the address, backs off, and sends the original message on retry', async () => {
  mock.method(console, 'warn', () => {})
  const original = notification()
  await queueEngagementNotification(db, original)
  const send = mock.method(globalThis, 'fetch', async () => Response.json({ name: 'daily_quota_exceeded', message: 'Quota reached' }, { status: 429 }))
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'deferred' })
  const { rows } = await client.query<{ message: unknown; sent_at: string | null; last_error: string; delayed: boolean }>('SELECT message, sent_at, last_error, next_attempt_at > now() AS delayed FROM engagement_notifications')
  assert.equal(rows[0].sent_at, null)
  assert.equal(rows[0].last_error, 'daily_quota_exceeded')
  assert.equal(rows[0].delayed, true)
  assert.deepEqual(rows[0].message, original.message)
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'empty' })
  assert.equal(send.mock.callCount(), 1)

  await client.exec('UPDATE engagement_notifications SET next_attempt_at = now()')
  send.mock.mockImplementation(async () => Response.json({ id: 'test-email-id' }))
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'sent' })
  for (const call of send.mock.calls) {
    const options = call.arguments[1] as RequestInit
    assert.equal(new Headers(options.headers).get('idempotency-key'), original.idempotencyKey)
    assert.equal(JSON.parse(options.body as string).reply_to, 'reader@example.test')
  }
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'empty' })
  assert.equal(send.mock.callCount(), 2)
})

test('overlapping scheduler runs claim a pending notification only once', async () => {
  await queueEngagementNotification(db, notification())
  const send = mock.method(globalThis, 'fetch', async () => Response.json({ id: 'one-email-id' }))
  const results = await Promise.all([deliverNextEngagementNotification(db), deliverNextEngagementNotification(db)])
  assert.deepEqual(results.map(result => result.status).sort(), ['empty', 'sent'])
  assert.equal(send.mock.callCount(), 1)
})

test('network failures retain pending messages and expired leases can be retried', async () => {
  mock.method(console, 'warn', () => {})
  await queueEngagementNotification(db, notification())
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Offline') })
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'deferred' })
  const { rows } = await client.query<{ sent_at: string | null }>('SELECT sent_at FROM engagement_notifications')
  assert.equal(rows[0].sent_at, null)
  await client.exec("UPDATE engagement_notifications SET next_attempt_at = now() - interval '1 minute'")
  send.mock.mockImplementation(async () => Response.json({ id: 'recovered-email-id' }))
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'sent' })
})

test('local and production notifications stay separate', async () => {
  await queueEngagementNotification(db, notification())
  await client.exec("UPDATE engagement_notifications SET environment = 'production'")
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected send') })
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'empty' })
  assert.equal(send.mock.callCount(), 0)
})

test('a missing provider key leaves saved notifications pending', async (t) => {
  await queueEngagementNotification(db, notification())
  const key = process.env.RESEND_API_KEY
  t.after(() => { process.env.RESEND_API_KEY = key })
  delete process.env.RESEND_API_KEY
  assert.deepEqual(await deliverNextEngagementNotification(db), { status: 'unconfigured' })
  const { rows } = await client.query<{ count: number }>('SELECT count(*)::int AS count FROM engagement_notifications WHERE sent_at IS NULL')
  assert.equal(rows[0].count, 1)
})

test('saved email addresses are inaccessible to public database roles', async () => {
  await queueEngagementNotification(db, notification())
  await client.exec('CREATE ROLE engagement_queue_anon; GRANT SELECT ON engagement_notifications TO engagement_queue_anon; SET ROLE engagement_queue_anon;')
  try {
    const result = await client.query('SELECT message FROM engagement_notifications')
    assert.equal(result.rows.length, 0)
  } finally {
    await client.exec('RESET ROLE')
  }
})

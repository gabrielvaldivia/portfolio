import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { readBackgroundWorkSchedule, isBackgroundWorkDue } from '../src/lib/backgroundWorkSchedule'
import { up as newsletters } from '../src/migrations/20261002_120000_queue_note_newsletters'
import { up as notifications } from '../src/migrations/20260922_223000_queue_engagement_notifications'

const client = new PGlite()
const db = drizzle(client)
const schedule = () => readBackgroundWorkSchedule(db, 'production')
const future = '2099-10-08T04:00:00.000Z'
const past = '2020-10-01T00:00:00.000Z'

before(async () => {
  await client.exec('CREATE TABLE notes (id integer PRIMARY KEY, _status varchar, scheduled_for timestamptz, newsletter_sent_at timestamptz)')
  const migrationDB = { execute: (query: SQL) => client.exec(new PgDialect().sqlToQuery(query).sql) }
  await newsletters({ db: migrationDB } as any)
  await notifications({ db: migrationDB } as any)
})
beforeEach(async () => {
  await client.exec('TRUNCATE notes, note_newsletters, note_newsletter_deliveries, note_newsletter_daily_slots, note_newsletter_runner, engagement_notifications CASCADE')
})
after(async () => { await client.close() })

async function queueNewsletter(environment = 'production') {
  const newsletter = randomUUID()
  const delivery = randomUUID()
  await client.exec("INSERT INTO notes (id, _status) VALUES (1, 'published') ON CONFLICT DO NOTHING")
  await client.query('INSERT INTO note_newsletters (id, note_id, environment) VALUES ($1, 1, $2)', [newsletter, environment])
  await client.query("INSERT INTO note_newsletter_deliveries (id, newsletter_id, email, message, next_attempt_at) VALUES ($1, $2, 'test@example.test', '{}', $3)", [delivery, newsletter, past])
  return delivery
}

test('empty queues have no due work', async () => {
  const result = await schedule()
  assert.deepEqual(result, { publishing: null, notifications: null, newsletters: null })
  for (const job of ['publishing', 'notifications', 'newsletters'] as const) assert.equal(isBackgroundWorkDue(result, job), false)
})

test('future publications remain asleep until their exact timestamp, with no database read at that boundary', async () => {
  await client.query("INSERT INTO notes VALUES (1, 'draft', $1, NULL), (2, 'published', $2, NULL)", [future, past])
  const result = await schedule()
  assert.equal(result.publishing, future)
  assert.equal(isBackgroundWorkDue(result, 'publishing', Date.parse(future) - 1), false)
  assert.equal(isBackgroundWorkDue(result, 'publishing', Date.parse(future)), true)
  await client.exec("UPDATE notes SET _status='published', scheduled_for=NULL WHERE id=1")
  assert.equal((await schedule()).publishing, null)
})

test('only unsent notifications in the current environment contribute, with retries respecting their deadline', async () => {
  await client.query("INSERT INTO engagement_notifications (idempotency_key, environment, message, next_attempt_at) VALUES ('future', 'production', '{}', $1), ('local', 'local', '{}', $2), ('sent', 'production', '{}', $2)", [future, past])
  await client.exec("UPDATE engagement_notifications SET sent_at=now() WHERE idempotency_key='sent'")
  const result = await schedule()
  assert.equal(result.notifications, future)
  assert.equal(isBackgroundWorkDue(result, 'notifications'), false)
  await client.query("UPDATE engagement_notifications SET next_attempt_at=$1 WHERE idempotency_key='future'", [past])
  assert.equal(isBackgroundWorkDue(await schedule(), 'notifications'), true)
})

test('newsletter jobs wake for new deliveries but not completed, review-only, local or unpublished queues', async () => {
  await queueNewsletter()
  assert.equal(isBackgroundWorkDue(await schedule(), 'newsletters'), true)
  await client.exec("UPDATE notes SET _status='draft'")
  assert.equal((await schedule()).newsletters, null)
  await client.exec("UPDATE notes SET _status='published'; UPDATE note_newsletter_deliveries SET status='review'")
  assert.equal((await schedule()).newsletters, null)
  await client.exec("UPDATE note_newsletter_deliveries SET status='sent'")
  assert.equal((await schedule()).newsletters, null)
  await queueNewsletter('local')
  assert.equal((await schedule()).newsletters, null)
})

test('provider pauses and in-flight leases defer work rather than waking the database every five minutes', async () => {
  await queueNewsletter()
  await client.query('INSERT INTO note_newsletter_runner (environment, paused_until) VALUES ($1, $2)', ['production', future])
  assert.equal((await schedule()).newsletters, future)
  await client.query("UPDATE note_newsletter_runner SET paused_until='-infinity', lease_until=$1", [future])
  assert.equal((await schedule()).newsletters, future)
})

test('an exhausted daily budget sleeps until UTC midnight while allowing retries with an existing reservation', async () => {
  const delivery = await queueNewsletter()
  await client.exec("INSERT INTO note_newsletter_runner (environment, used_today) VALUES ('production', 100)")
  const midnight = (await client.query<{ midnight: Date }>("SELECT (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC' AS midnight")).rows[0].midnight.toISOString()
  assert.equal((await schedule()).newsletters, midnight)
  await client.query("INSERT INTO note_newsletter_daily_slots VALUES ($1, 'production', (now() AT TIME ZONE 'UTC')::date)", [delivery])
  assert.equal(isBackgroundWorkDue(await schedule(), 'newsletters'), true)
  await client.exec("DELETE FROM note_newsletter_daily_slots; UPDATE note_newsletter_runner SET budget_day=budget_day-1")
  assert.equal(isBackgroundWorkDue(await schedule(), 'newsletters'), true)
})

test('database errors are propagated, never mistaken for an empty queue', async () => {
  await assert.rejects(readBackgroundWorkSchedule({ execute: async () => { throw new Error('offline') } }, 'production'), /offline/)
  await assert.rejects(readBackgroundWorkSchedule({ execute: async () => ({ rows: [] }) }, 'production'), /unavailable/)
})

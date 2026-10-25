import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { countRateLimitRequest, ipv6Prefix64 } from '../src/lib/chatRateLimit'

const client = new PGlite()
const db = drizzle(client)
const windowStartedAt = new Date()
const dayStartedAt = new Date()

before(async () => {
  await client.exec(`CREATE TABLE "chat_rate_limits" (
    "key_hash" varchar PRIMARY KEY NOT NULL,
    "window_started_at" timestamp(3) with time zone NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL
  )`)
})
beforeEach(async () => { await client.exec('TRUNCATE chat_rate_limits') })
after(async () => { await client.close() })

const request = (visitor: string, limit = 3) =>
  countRateLimitRequest(db, { hourlyKeyHash: visitor, dailyKeyHash: 'daily', windowStartedAt, dayStartedAt, limit })

test('refused requests do not spend the shared daily budget', async () => {
  for (let i = 0; i < 10; i += 1) await request('burst')
  const burst = await request('burst')
  assert.equal(burst.window, 11)
  assert.equal(burst.daily, 3)

  const nextVisitor = await request('next')
  assert.deepEqual(nextVisitor, { window: 1, daily: 4 })
})

test('allowed requests count toward the daily budget', async () => {
  assert.deepEqual(await request('a'), { window: 1, daily: 1 })
  assert.deepEqual(await request('b'), { window: 1, daily: 2 })
  assert.deepEqual(await request('a'), { window: 2, daily: 3 })
})

test('IPv6 visitors are counted by their /64 prefix', () => {
  assert.equal(ipv6Prefix64('2001:db8:85a3:42:1:2:3:4'), '2001:db8:85a3:42::/64')
  assert.equal(ipv6Prefix64('2001:0db8:85a3:0042:ffff::1'), '2001:db8:85a3:42::/64')
  assert.equal(ipv6Prefix64('2001:db8::1'), '2001:db8:0:0::/64')
  assert.equal(ipv6Prefix64('2001:db8::'), ipv6Prefix64('2001:db8:0:0:9::'))
})

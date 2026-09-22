import assert from 'node:assert/strict'
import { afterEach, mock, test } from 'node:test'
import { NextRequest } from 'next/server'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  createEngagementAccessToken,
  ENGAGEMENT_ACCESS_COOKIE,
  ENGAGEMENT_ACCESS_MAX_AGE,
  engagementNotification,
  hasEngagementAccess,
  isValidEngagementEmail,
  normalizeEngagementEmail,
} from '../src/lib/engagementAccess'

// Keep all storage and email activity inside this test process.
Object.assign(process.env, { NODE_ENV: 'development' })
process.env.PAYLOAD_SKIP_DATABASE = '1'
process.env.PAYLOAD_SECRET = 'engagement-access-test-secret'
process.env.RESEND_API_KEY = 're_test_only'
const { getPayload } = await import('../src/lib/payload')
const { POST } = await import('../src/app/api/engagement-models/access/route')
const { GET: retryNotifications } = await import('../src/app/api/engagement-models/notifications/route')
const payload = await getPayload()

afterEach(() => mock.restoreAll())

const url = 'https://www.gabrielvaldivia.com/api/engagement-models/access'
function request(body: unknown = { email: 'reader@example.com' }, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: new URL(url).origin, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function allowRequests() {
  return mock.method(payload.db.drizzle, 'execute', async (query: any) => {
    const compiled = new PgDialect().sqlToQuery(query)
    return compiled.sql.includes('INSERT INTO engagement_notifications')
      ? { rows: [{ idempotency_key: compiled.params[0] }] }
      : { rows: [{ window_count: 1, daily_count: 1 }] }
  })
}

test('access tokens expire after a day and reject forged, malformed, or altered cookies', () => {
  const now = Date.parse('2026-09-16T12:00:00Z')
  const token = createEngagementAccessToken(now)
  assert.equal(hasEngagementAccess(token, now), true)
  assert.equal(hasEngagementAccess(token, now + ENGAGEMENT_ACCESS_MAX_AGE * 1_000 - 1), true)
  assert.equal(hasEngagementAccess(token, now + ENGAGEMENT_ACCESS_MAX_AGE * 1_000), false)
  for (const value of [undefined, 'true', 'reader@example.com', token + '.extra', token.slice(0, -1), 'x'.repeat(1_000)]) {
    assert.equal(hasEngagementAccess(value, now), false)
  }
  const [expiry, nonce, signature] = token.split('.')
  assert.equal(hasEngagementAccess(`${Number(expiry) - 10}.${nonce}.${signature}`, now), false)
  assert.equal(hasEngagementAccess(`${expiry}.${nonce}.${'0'.repeat(64)}`, now), false)
  assert.equal(hasEngagementAccess(token, now - 10_000), false)
})

test('email validation accepts ordinary addresses and rejects header injection or multiple recipients', () => {
  assert.equal(normalizeEngagementEmail(' Reader+project@Example.com '), 'reader+project@example.com')
  assert.equal(normalizeEngagementEmail({ email: 'fake' }), '')
  for (const email of ['reader@example.com', 'reader+project@sub.example.co.uk']) assert.equal(isValidEngagementEmail(email), true)
  for (const email of ['', 'invalid', 'a@b', 'a@example.com\r\nBcc: x@example.com', 'a@example.com,b@example.com', '<a@example.com>', 'a'.repeat(250) + '@example.com']) {
    assert.equal(isValidEngagementEmail(email), false)
  }
})

test('notification payload is stable on retry, identifies the supplied address, and deduplicates by day', () => {
  const first = engagementNotification('reader@example.com', new Date('2026-09-16T12:00:00Z'))
  const retry = engagementNotification('reader@example.com', new Date('2026-09-16T18:00:00Z'))
  const tomorrow = engagementNotification('reader@example.com', new Date('2026-09-17T12:00:00Z'))
  assert.deepEqual(first, retry)
  assert.notEqual(first.idempotencyKey, tomorrow.idempotencyKey)
  assert.notEqual(first.idempotencyKey, engagementNotification('another@example.com').idempotencyKey)
  assert.equal(first.message.replyTo, 'reader@example.com')
  assert.match(first.message.text, /reader@example.com entered their email/)
  assert.match(first.message.subject, /\[Local preview\]/)
  assert.equal(first.idempotencyKey.includes('reader@example.com'), false)
})

test('invalid envelopes, invalid emails, and honeypot submissions never send email or grant access', async () => {
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected email request') })
  for (const [input, expected] of [
    [request({}, { origin: 'https://attacker.example' }), 403],
    [request({}, { origin: '' }), 403],
    [request({}, { 'content-type': 'text/plain' }), 415],
    [request('{'), 400],
    [request({ email: 'x'.repeat(2_048) }), 413],
    [request({ email: 'invalid' }), 400],
    [request({ email: 'reader@example.com', website: 'spam' }), 400],
  ] as const) {
    const response = await POST(input)
    assert.equal(response.status, expected)
    assert.equal(response.headers.has('set-cookie'), false)
  }
  assert.equal(send.mock.callCount(), 0)
})

test('saving the email grants a private signed cookie without waiting for the email provider', async () => {
  const storage = allowRequests()
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected email request') })
  const response = await POST(request({ email: ' Reader@Example.com ' }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(storage.mock.callCount(), 2)
  const saved = new PgDialect().sqlToQuery(storage.mock.calls[1].arguments[0] as any)
  assert.equal(JSON.parse(saved.params[2] as string).replyTo, 'reader@example.com')
  assert.match(saved.params[0] as string, /^engagement-view:v2:local:/)
  assert.equal(send.mock.callCount(), 0)
  const cookie = response.headers.get('set-cookie')!
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=lax/i)
  assert.match(cookie, /Max-Age=86400/i)
  assert.equal(cookie.includes('reader'), false)
  assert.equal(hasEngagementAccess(cookie.split(';')[0].split('=')[1]), true)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
})

test('existing access neither sends another notification nor consumes the rate limit', async () => {
  const storage = allowRequests()
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected email request') })
  const response = await POST(request(undefined, { cookie: `${ENGAGEMENT_ACCESS_COOKIE}=${createEngagementAccessToken()}` }))
  assert.equal(response.status, 200)
  assert.equal(storage.mock.callCount(), 0)
  assert.equal(send.mock.callCount(), 0)
  assert.equal(response.headers.has('set-cookie'), false)
})

test('rate limiting blocks email and access with a retry time', async () => {
  mock.method(payload.db.drizzle, 'execute', async () => ({ rows: [{ window_count: 6, daily_count: 6 }] }))
  const send = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected email request') })
  const response = await POST(request())
  assert.equal(response.status, 429)
  assert.ok(Number(response.headers.get('retry-after')) > 0)
  assert.equal(response.headers.has('set-cookie'), false)
  assert.equal(send.mock.callCount(), 0)
})

test('email quotas and missing email configuration do not block access after saving the address', async (t) => {
  allowRequests()
  const key = process.env.RESEND_API_KEY
  t.after(() => { process.env.RESEND_API_KEY = key })
  const send = mock.method(globalThis, 'fetch', async () => Response.json({ name: 'daily_quota_exceeded' }, { status: 429 }))
  assert.equal((await POST(request())).status, 200)
  delete process.env.RESEND_API_KEY
  assert.equal((await POST(request())).status, 200)
  assert.equal(send.mock.callCount(), 0)
})

test('failed email storage keeps the page locked and permits a later retry', async () => {
  const storage = allowRequests()
  mock.method(console, 'error', () => {})
  storage.mock.mockImplementation(async (query: any) => {
    if (new PgDialect().sqlToQuery(query).sql.includes('INSERT INTO engagement_notifications')) throw new Error('Storage unavailable')
    return { rows: [{ window_count: 1, daily_count: 1 }] }
  })
  const failed = await POST(request())
  assert.equal(failed.status, 503)
  assert.equal(failed.headers.has('set-cookie'), false)
  storage.mock.mockImplementation(async () => ({ rows: [] }))
  // Empty results from the unavailable-database fallback cannot grant access.
  const unavailable = await POST(request())
  assert.notEqual(unavailable.status, 200)
  storage.mock.restore()
  allowRequests()
  assert.equal((await POST(request())).status, 200)
})

test('notification retries require the scheduler secret', async (t) => {
  const secret = process.env.CRON_SECRET
  t.after(() => { if (secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secret })
  delete process.env.CRON_SECRET
  assert.equal((await retryNotifications(new Request(url))).status, 503)
  process.env.CRON_SECRET = 'scheduler-test-secret'
  assert.equal((await retryNotifications(new Request(url))).status, 401)
  assert.equal((await retryNotifications(new Request(url, { headers: { authorization: 'Bearer wrong' } }))).status, 401)
})

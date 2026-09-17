import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import type { Payload } from 'payload'
import { confirmNoteSubscription } from '../src/lib/noteSubscriptionConfirmation'

const email = 'reader@example.com'
const pending = {
  id: 12,
  email,
  status: 'pending',
  confirmedAt: null,
  unsubscribedAt: null,
  createdAt: '2026-09-17T12:00:00.000Z',
  updatedAt: '2026-09-17T12:00:00.000Z',
}

const testEnvironment = {
  NODE_ENV: 'development',
  RESEND_API_KEY: 're_test_only',
  NOTES_EMAIL_FROM: 'Notes <notes@example.com>',
  NOTES_SUBSCRIBER_EMAIL_TO: 'owner@example.com',
  CONTACT_EMAIL_TO: '',
  NEXT_PUBLIC_SERVER_URL: 'https://portfolio.example',
}
const originalEnvironment = Object.fromEntries(Object.keys(testEnvironment).map((key) => [key, process.env[key]]))
beforeEach(() => Object.assign(process.env, testEnvironment))
afterEach(() => {
  mock.restoreAll()
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

function storage(initial: Record<string, unknown> | null = pending) {
  let subscriber = initial ? { ...initial } : null
  const find = mock.fn(async () => ({ docs: subscriber ? [{ ...subscriber }] : [] }))
  const update = mock.fn(async ({ data }: { data: Record<string, unknown> }) => {
    subscriber = { ...subscriber, ...data, updatedAt: '2026-09-17T12:01:00.000Z' }
    return subscriber
  })
  const create = mock.fn(async ({ data }: { data: Record<string, unknown> }) => {
    subscriber = { ...pending, ...data }
    return subscriber
  })
  return { payload: { find, update, create } as unknown as Payload, find, update, create }
}

function emailRequests() {
  const requests: { body: Record<string, any>; key: string | null }[] = []
  const send = mock.method(globalThis, 'fetch', async (_url: unknown, options?: RequestInit) => {
    requests.push({ body: JSON.parse(options?.body as string), key: new Headers(options?.headers).get('idempotency-key') })
    return Response.json({ id: 'notification-test-id' })
  })
  return { requests, send }
}

test('confirmation saves the subscription before notifying the owner with a reply-to and admin link', async () => {
  const db = storage()
  const { requests, send } = emailRequests()
  send.mock.mockImplementation(async (_url: unknown, options?: RequestInit) => {
    assert.equal(db.update.mock.callCount(), 1)
    assert.equal(db.update.mock.calls[0].arguments[0].data.status, 'subscribed')
    requests.push({ body: JSON.parse(options?.body as string), key: new Headers(options?.headers).get('idempotency-key') })
    return Response.json({ id: 'notification-test-id' })
  })

  const result = await confirmNoteSubscription(db.payload, email)
  assert.equal(result.status, 'subscribed')
  assert.equal(requests.length, 1)
  assert.equal(requests[0].body.to, 'owner@example.com')
  assert.equal(requests[0].body.reply_to, email)
  assert.match(requests[0].body.subject, /\[Local preview\] New Notes subscriber: reader@example.com/)
  assert.match(requests[0].body.text, /confirmed their subscription/)
  assert.match(requests[0].body.text, /https:\/\/portfolio.example\/admin\/collections\/note-subscribers\/12/)
  assert.match(requests[0].key!, /^notes-subscriber:local:/)
  assert.equal(requests[0].key!.includes(email), false)

  await confirmNoteSubscription(db.payload, email)
  assert.equal(db.update.mock.callCount(), 1)
  assert.equal(requests.length, 1, 'reopening the confirmation link does not notify again')
})

test('confirmation can recreate a missing subscriber and notify after creation', async () => {
  const db = storage(null)
  const { requests } = emailRequests()
  const result = await confirmNoteSubscription(db.payload, email)
  assert.equal(result.status, 'subscribed')
  assert.equal(db.create.mock.callCount(), 1)
  assert.equal(requests.length, 1)
})

test('concurrent confirmations use the same notification key and body', async () => {
  const { requests } = emailRequests()
  await Promise.all([
    confirmNoteSubscription(storage().payload, email),
    confirmNoteSubscription(storage().payload, email),
  ])
  assert.equal(requests.length, 2)
  assert.deepEqual(requests[0], requests[1])
})

test('a later resubscription produces a fresh notification key', async () => {
  const { requests } = emailRequests()
  await confirmNoteSubscription(storage().payload, email)
  await confirmNoteSubscription(storage({ ...pending, updatedAt: '2026-09-18T12:00:00.000Z' }).payload, email)
  assert.notEqual(requests[0].key, requests[1].key)
})

test('owner mail failures leave the subscriber confirmed and are logged', async () => {
  const log = mock.method(console, 'error', () => {})
  const { send } = emailRequests()
  for (const failure of ['provider', 'network']) {
    send.mock.mockImplementation(async () => {
      if (failure === 'network') throw new Error('Network unavailable')
      return Response.json({ name: 'validation_error', message: 'Rejected' }, { status: 403 })
    })
    assert.equal((await confirmNoteSubscription(storage().payload, email)).status, 'subscribed')
  }
  assert.equal(log.mock.callCount(), 2)
})

test('a failed subscription write never sends a notification', async () => {
  const db = storage()
  const { send } = emailRequests()
  db.update.mock.mockImplementation(async () => { throw new Error('Storage unavailable') })
  await assert.rejects(confirmNoteSubscription(db.payload, email), /Storage unavailable/)
  assert.equal(send.mock.callCount(), 0)
})

test('notification recipient falls back to the existing contact inbox', async () => {
  process.env.NOTES_SUBSCRIBER_EMAIL_TO = ''
  process.env.CONTACT_EMAIL_TO = 'contact@example.com'
  const { requests } = emailRequests()
  await confirmNoteSubscription(storage().payload, email)
  assert.equal(requests[0].body.to, 'contact@example.com')
})

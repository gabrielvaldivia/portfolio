import assert from 'node:assert/strict'
import test from 'node:test'
import { POST } from '../src/app/api/contact/route'

const url = 'https://www.gabrielvaldivia.com/api/contact'

function request(body: string, headers: Record<string, string> = { 'content-type': 'application/json' }) {
  return new Request(url, { method: 'POST', headers, body })
}

test('contact rejects cross-site, non-JSON, malformed, and oversized requests', async () => {
  const crossSite = await POST(request('{}', {
    'content-type': 'application/json',
    origin: 'https://example.com',
  }))
  assert.equal(crossSite.status, 403)

  const wrongType = await POST(request('{}', { 'content-type': 'text/plain' }))
  assert.equal(wrongType.status, 415)

  const malformed = await POST(request('{', { 'content-type': 'application/json' }))
  assert.equal(malformed.status, 400)

  const oversized = await POST(request(JSON.stringify({ message: 'x'.repeat(8_192) })))
  assert.equal(oversized.status, 413)
})

test('contact validates fields without calling the email service', async () => {
  const invalidEmail = await POST(request(JSON.stringify({
    fromEmail: 'invalid',
    subject: 'Hello',
    message: 'A sufficiently long message.',
  })))
  assert.equal(invalidEmail.status, 400)

  const multilineSubject = await POST(request(JSON.stringify({
    fromEmail: 'reader@example.com',
    subject: 'Hello\nBcc: someone@example.com',
    message: 'A sufficiently long message.',
  })))
  assert.equal(multilineSubject.status, 400)

  const honeypot = await POST(request(JSON.stringify({ website: 'spam.example' })))
  assert.equal(honeypot.status, 200)
  assert.deepEqual(await honeypot.json(), { ok: true })
})

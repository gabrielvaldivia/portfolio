import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertSameOrigin,
  HTTPRequestError,
  readJSONBody,
} from '../src/lib/httpRequest'

function expectRequestError(error: unknown, status: number) {
  assert.ok(error instanceof HTTPRequestError)
  assert.equal(error.status, status)
  return true
}

test('reads bounded JSON objects with standard and structured media types', async () => {
  const standard = new Request('https://example.com/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ok: true }),
  })
  assert.deepEqual(await readJSONBody(standard, { maxBytes: 64 }), { ok: true })

  const structured = new Request('https://example.com/api', {
    method: 'POST',
    headers: { 'content-type': 'application/problem+json' },
    body: JSON.stringify({ title: 'Problem' }),
  })
  assert.deepEqual(await readJSONBody(structured, { maxBytes: 64 }), { title: 'Problem' })
})

test('rejects non-JSON, malformed, array, declared-large, and streamed-large bodies', async () => {
  const cases: Array<[Request, number]> = [
    [new Request('https://example.com/api', { method: 'POST', body: '{}' }), 415],
    [new Request('https://example.com/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }), 400],
    [new Request('https://example.com/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '[]' }), 400],
    [new Request('https://example.com/api', { method: 'POST', headers: { 'content-length': '100', 'content-type': 'application/json' }, body: '{}' }), 413],
    [new Request('https://example.com/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'too large' }) }), 413],
  ]

  for (const [request, status] of cases) {
    await assert.rejects(() => readJSONBody(request, { maxBytes: 8 }), (error) => expectRequestError(error, status))
  }
})

test('allows same-site or absent origins and rejects cross-site requests', () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://example.com/api')))
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://example.com/api', {
    headers: { origin: 'https://example.com' },
  })))

  assert.throws(
    () => assertSameOrigin(new Request('https://example.com/api', {
      headers: { origin: 'https://attacker.example' },
    })),
    (error) => expectRequestError(error, 403),
  )
  assert.throws(
    () => assertSameOrigin(new Request('https://example.com/api', {
      headers: { 'sec-fetch-site': 'cross-site' },
    })),
    (error) => expectRequestError(error, 403),
  )
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { POST as chat } from '../src/app/api/chat/route'
import { POST as createConversation } from '../src/app/api/chat/conversations/route'
import { PATCH as updateConversation } from '../src/app/api/chat/conversations/[id]/route'
import { POST as saveLike } from '../src/app/api/module-likes/route'
import { POST as subscribe } from '../src/app/api/notes/subscribe/route'

function request(
  url: string,
  {
    body = '{}',
    contentType = 'application/json',
    contentLength,
    origin,
  }: {
    body?: string
    contentType?: string
    contentLength?: number
    origin?: string
  } = {},
) {
  const headers = new Headers({ 'content-type': contentType })
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  if (origin) headers.set('origin', origin)
  return new NextRequest(url, { method: 'POST', headers, body })
}

test('chat rejects cross-site, non-JSON, and oversized requests before doing work', async () => {
  assert.equal((await chat(request('https://example.com/api/chat', { origin: 'https://attacker.example' }))).status, 403)
  assert.equal((await chat(request('https://example.com/api/chat', { contentType: 'text/plain' }))).status, 415)
  assert.equal((await chat(request('https://example.com/api/chat', { contentLength: 80_001 }))).status, 413)
})

test('conversation writes enforce the shared request guard', async () => {
  assert.equal((await createConversation(request('https://example.com/api/chat/conversations', { contentType: 'text/plain' }))).status, 415)
  assert.equal((await updateConversation(
    request('https://example.com/api/chat/conversations/1', { contentLength: 80_001 }),
    { params: Promise.resolve({ id: '1' }) },
  )).status, 413)
})

test('likes and subscriptions reject invalid request envelopes before storage', async () => {
  assert.equal((await saveLike(request('https://example.com/api/module-likes', { contentLength: 2_049 }))).status, 413)
  assert.equal((await subscribe(request('https://example.com/api/notes/subscribe', { contentType: 'text/plain' }))).status, 415)
  assert.equal((await subscribe(request('https://example.com/api/notes/subscribe', { origin: 'https://attacker.example' }))).status, 403)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Payload, PayloadRequest } from 'payload'
import { Notes } from '../src/collections/Notes'
import {
  createNotePreviewToken,
  generateNotePreviewURL,
  getNotePreview,
  verifyNotePreviewToken,
} from '../src/lib/notePreview'

test('preview tokens authorize exactly one note for 30 days', () => {
  const now = Date.now()
  const token = createNotePreviewToken(42, now)
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000
  assert.deepEqual(verifyNotePreviewToken(token, now), { noteID: 42, expiresAt })
  assert.equal(verifyNotePreviewToken(token, expiresAt - 1)?.noteID, 42)
  assert.equal(verifyNotePreviewToken(token, expiresAt), null)
  assert.throws(() => createNotePreviewToken(0))
  assert.throws(() => createNotePreviewToken(NaN))
})

test('rejects changes to note IDs, expiry, and signatures', () => {
  const token = createNotePreviewToken(42)
  const [encoded, signature] = token.split('.')
  const data = JSON.parse(Buffer.from(encoded, 'base64url').toString())
  for (const change of [{ ...data, noteID: 43 }, { ...data, expiresAt: data.expiresAt + 1 }]) {
    const altered = Buffer.from(JSON.stringify(change)).toString('base64url')
    assert.equal(verifyNotePreviewToken(`${altered}.${signature}`), null)
  }
  const alteredSignature = (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1)
  assert.equal(verifyNotePreviewToken(`${encoded}.${alteredSignature}`), null)
  for (const invalid of ['', '42', token + '.extra', `${encoded}.short`, 'x'.repeat(513)]) {
    assert.equal(verifyNotePreviewToken(invalid), null)
  }
})

test('only authenticated CMS users receive preview links', () => {
  const req = { user: null } as PayloadRequest
  assert.equal(generateNotePreviewURL({ id: 42 }, { req }), null)
  req.user = { id: 1, collection: 'users' } as PayloadRequest['user']
  assert.equal(generateNotePreviewURL({}, { req }), null)
  const url = generateNotePreviewURL({ id: 42 }, { req })!
  assert.ok(url.startsWith('/notes/preview/'))
  assert.equal(verifyNotePreviewToken(url.split('/').at(-1)!)?.noteID, 42)
  assert.equal(Notes.admin?.preview, generateNotePreviewURL)
})

test('invalid and expired links never initialize or query the database', async () => {
  const unexpectedLoad = async (): Promise<Payload> => { throw new Error('Must not load Payload') }
  assert.equal(await getNotePreview('invalid', unexpectedLoad), null)
  const expired = createNotePreviewToken(42, Date.now() - 31 * 24 * 60 * 60 * 1000)
  assert.equal(await getNotePreview(expired, unexpectedLoad), null)
})

test('valid links read the latest draft for their note without publishing or exposing admin metadata', async () => {
  let currentTitle = 'First draft'
  let queries = 0
  const payload = {
    findByID: async (options: Record<string, unknown>) => {
      queries++
      assert.deepEqual(options, {
        collection: 'notes', id: 42, draft: true, overrideAccess: true,
        disableErrors: true, depth: 1,
        select: { title: true, body: true, coverImage: true, createdAt: true, publishedAt: true },
      })
      return { id: 42, title: currentTitle }
    },
  } as unknown as Pick<Payload, 'findByID'>
  const token = createNotePreviewToken(42)
  assert.equal((await getNotePreview(token, async () => payload))?.note.title, 'First draft')
  currentTitle = 'Updated draft'
  assert.equal((await getNotePreview(token, async () => payload))?.note.title, 'Updated draft')
  assert.equal(queries, 2)
})

test('deleted notes have no preview and anonymous collection access remains published-only', async () => {
  const payload = { findByID: async () => null } as unknown as Payload
  assert.equal(await getNotePreview(createNotePreviewToken(42), async () => payload), null)
  assert.deepEqual(await Notes.access!.read!({ req: { user: null } as PayloadRequest }), {
    _status: { equals: 'published' },
  })
})

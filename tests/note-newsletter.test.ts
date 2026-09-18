import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import type { Payload, PayloadRequest } from 'payload'
import { renderNoteEmailContent } from '../src/lib/noteEmailContent'
import { sendPublishedNoteNewsletter } from '../src/lib/noteNewsletter'
import { verifySubscriptionToken } from '../src/lib/noteSubscriptions'

const text = (value: string, format = 0) => ({ type: 'text', text: value, format, version: 1 })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children, version: 1 })
const body = { root: { type: 'root', version: 1, children: [
  paragraph(text('The first paragraph. '), text('Bold', 1), text(' and '), text('italic', 2)),
  { type: 'heading', tag: 'h3', children: [text('A section')], version: 1 },
  paragraph(text('Long middle paragraph. '.repeat(100))),
  { type: 'list', tag: 'ol', start: 3, listType: 'number', children: [
    { type: 'listitem', value: 3, children: [text('A numbered item')], version: 1 },
  ], version: 1 },
  { type: 'quote', children: [text('A quoted thought')], version: 1 },
  paragraph(text('The final paragraph with <literal> text & punctuation.')),
] } }

test('email contains every paragraph with the note’s rich-text formatting', () => {
  const result = renderNoteEmailContent(body, 'https://portfolio.example')
  assert.match(result.html, /^<p[^>]*>The first paragraph/)
  assert.match(result.html, /<strong[^>]*>Bold<\/strong>/)
  assert.match(result.html, /<em>italic<\/em>/)
  assert.match(result.html, /<h3[^>]*>A section<\/h3>/)
  assert.match(result.html, /<ol start="3"[^>]*><li[^>]*>A numbered item<\/li><\/ol>/)
  assert.match(result.html, /<blockquote[^>]*>A quoted thought<\/blockquote>/)
  assert.match(result.html, /The final paragraph with &lt;literal&gt; text &amp; punctuation\./)
  assert.ok(result.text.includes('Long middle paragraph. '.repeat(100)))
  assert.match(result.text, /italic\n\nA section\n\nLong middle/)
  assert.match(result.text, /The final paragraph with <literal> text & punctuation\.$/)
})

test('email uses absolute, safe links and renders inline images', () => {
  const link = (fields: Record<string, unknown>, label = 'Read more') => ({ type: 'link', fields, children: [text(label)], version: 1 })
  const links = { root: { type: 'root', version: 1, children: [
    paragraph(link({ url: '/about?from=notes&lang=en' })),
    paragraph(link({ linkType: 'internal', doc: { relationTo: 'notes', value: { slug: 'another-note' } } }, 'Another note')),
    paragraph(link({ linkType: 'internal', doc: { relationTo: 'projects', value: { slug: 'project' } } })),
    paragraph(link({ url: 'javascript:alert(1)' }, '<script>Bad link</script>')),
    paragraph(link({ url: 'https://cdn-images-1.medium.com/max/1200/image.jpg' }, 'View image')),
    { type: 'upload', value: { url: '/media/photo.jpg', mimeType: 'image/jpeg', alt: 'A "photo"', sizes: {} }, version: 1 },
    { type: 'autolink', fields: { url: 'https://example.com' }, children: [text('Example')], version: 1 },
  ] } }
  const result = renderNoteEmailContent(links, 'https://portfolio.example')
  assert.match(result.html, /href="https:\/\/portfolio.example\/about\?from=notes&amp;lang=en"/)
  assert.match(result.html, /href="https:\/\/portfolio.example\/notes\/another-note"/)
  assert.match(result.html, /href="https:\/\/portfolio.example\/work\/project"/)
  assert.match(result.html, /<img src="https:\/\/cdn-images-1.medium.com\/max\/1200\/image.jpg"/)
  assert.match(result.html, /<img src="https:\/\/portfolio.example\/media\/photo.jpg" alt="A &quot;photo&quot;"/)
  assert.doesNotMatch(result.html, /javascript:|<script>/)
  assert.match(result.text, /Another note \(https:\/\/portfolio.example\/notes\/another-note\)/)
  assert.match(result.text, /Example \(https:\/\/example.com\/\)/)
})

const environment = {
  RESEND_API_KEY: 're_test_only',
  PAYLOAD_SECRET: 'newsletter-tests-only',
  NEXT_PUBLIC_SERVER_URL: 'https://portfolio.example',
}
const originalEnvironment = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]))
beforeEach(() => Object.assign(process.env, environment))
afterEach(() => {
  mock.restoreAll()
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('newsletter sends full content with only the requested footer and recipient-specific unsubscribe links', async () => {
  const note = { id: 123, title: 'The note title', slug: 'the-note', excerpt: 'Only a teaser', updatedAt: '2026-09-18T18:00:00Z', body }
  const req = {} as PayloadRequest
  const find = mock.fn(async () => ({ docs: [{ email: 'first@example.com' }, { email: 'second@example.com' }], hasNextPage: false }))
  const findByID = mock.fn(async () => note)
  const payload = { find, findByID } as unknown as Payload
  let sent: any[] = []
  let idempotencyKey: string | null = null
  mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
    assert.equal(String(url), 'https://api.resend.com/emails/batch')
    sent = JSON.parse(options?.body as string)
    idempotencyKey = new Headers(options?.headers).get('idempotency-key')
    return Response.json({ data: [{ id: 'test-first' }, { id: 'test-second' }] })
  })

  assert.deepEqual(await sendPublishedNoteNewsletter(note, payload, req), { recipientCount: 2 })
  assert.equal(findByID.mock.callCount(), 1)
  assert.deepEqual((findByID.mock.calls[0].arguments as unknown[])[0], {
    collection: 'notes', id: 123, depth: 2, draft: false, overrideAccess: true, req,
  })
  assert.deepEqual(((find.mock.calls[0].arguments as unknown[])[0] as any).where, { status: { equals: 'subscribed' } })
  assert.equal(idempotencyKey, 'note-123-2026-09-18T18:00:00Z-0')
  for (const [index, email] of sent.entries()) {
    assert.equal(email.subject, note.title)
    assert.match(email.html, /<body style="margin:0;padding:0;/)
    assert.match(email.html, /The final paragraph/)
    assert.match(email.text, /The final paragraph/)
    assert.match(email.html, /You subscribe to Gabriel Valdivia's notes at <a[^>]*>gabrielvaldivia.com<\/a>\. <a[^>]*>Unsubscribe<\/a>/)
    assert.doesNotMatch(email.html, /A new note from|Read the note|Only a teaser|<main|<hr|The note title|padding:48px/)
    const url = new URL(email.headers['List-Unsubscribe'].slice(1, -1))
    assert.deepEqual(verifySubscriptionToken(url.searchParams.get('token')!, 'unsubscribe'), { email: index ? 'second@example.com' : 'first@example.com' })
    assert.equal(email.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
    assert.ok(email.html.includes(url.href))
    assert.ok(email.text.includes(url.href))
  }
})

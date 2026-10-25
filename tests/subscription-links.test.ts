import assert from 'node:assert/strict'
import { before, test } from 'node:test'

let createSubscriptionToken: typeof import('../src/lib/noteSubscriptions').createSubscriptionToken
let unsubscribeGET: typeof import('../src/app/api/notes/unsubscribe/route').GET
let confirmGET: typeof import('../src/app/api/notes/subscribe/confirm/route').GET

before(async () => {
  process.env.PAYLOAD_SECRET ||= 'subscription-links-test-secret'
  process.env.NEXT_PUBLIC_SERVER_URL = 'https://portfolio.example'
  ;({ createSubscriptionToken } = await import('../src/lib/noteSubscriptions'))
  ;({ GET: unsubscribeGET } = await import('../src/app/api/notes/unsubscribe/route'))
  ;({ GET: confirmGET } = await import('../src/app/api/notes/subscribe/confirm/route'))
})

// Mail scanners open every link, and site pages load analytics that record URLs.
for (const [name, purpose, path, button] of [
  ['unsubscribe', 'unsubscribe', '/api/notes/unsubscribe', 'Unsubscribe'],
  ['confirmation', 'confirm', '/api/notes/subscribe/confirm', 'Confirm subscription'],
] as const) {
  test(`opening a ${name} link only shows a private confirmation step`, async () => {
    const token = createSubscriptionToken('reader@example.com', purpose, 3600)
    const get = purpose === 'unsubscribe' ? unsubscribeGET : confirmGET
    const response = await get(new Request(`https://portfolio.example${path}?token=${encodeURIComponent(token)}`))
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const html = await response.text()
    assert.match(html, /<form method="post"/)
    assert.match(html, new RegExp(`>${button}</button>`))
    assert.doesNotMatch(html, /googletagmanager|gtag\(/)
  })
}

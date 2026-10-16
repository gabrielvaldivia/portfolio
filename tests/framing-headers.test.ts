import assert from 'node:assert/strict'
import { test } from 'node:test'
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'
import nextConfig from '../next.config'

const publicPolicy = "frame-ancestors 'self' https://campground-gv.vercel.app http://localhost:3158;"

async function responseFor(path: string, host = 'www.gabrielvaldivia.com') {
  return unstable_getResponseFromNextConfig({ url: `https://${host}${path}`, nextConfig })
}

test('public pages allow only the approved frame ancestors on either hostname', async () => {
  for (const host of ['gabrielvaldivia.com', 'www.gabrielvaldivia.com']) {
    for (const path of ['/', '/about', '/work', '/work/dex', '/notes', '/notes/example', '/photos/example', '/playground/example', '/dive/work/dex', '/missing-page']) {
      const { headers } = await responseFor(path, host)
      assert.equal(headers.get('content-security-policy'), publicPolicy, `${host}${path}`)
      assert.equal(headers.has('x-frame-options'), false, `${host}${path}`)
      assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
      assert.equal(headers.get('x-content-type-options'), 'nosniff')
    }
  }
})

test('CMS, APIs, and draft previews retain same-origin framing restrictions', async () => {
  for (const path of ['/admin', '/admin/login', '/admin/collections/notes', '/api', '/api/notes/subscribe', '/notes/preview', '/notes/preview/example']) {
    const { headers } = await responseFor(path)
    assert.equal(headers.get('content-security-policy'), "frame-ancestors 'self';", path)
    assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN', path)
  }
})

test('existing page-specific security policies are preserved', async () => {
  const home = await responseFor('/')
  assert.equal(home.headers.get('permissions-policy'), 'camera=(), geolocation=(), microphone=(), payment=(), usb=()')

  const dive = await responseFor('/dive/work/dex')
  assert.equal(dive.headers.get('permissions-policy'), 'camera=(self), geolocation=(), microphone=(self), payment=(), usb=()')
  assert.equal(dive.headers.get('x-robots-tag'), 'noindex, nofollow')

  const preview = await responseFor('/notes/preview/example')
  assert.equal(preview.headers.get('referrer-policy'), 'no-referrer')
  assert.equal(preview.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive')
  assert.equal(preview.headers.get('cache-control'), 'private, no-store, max-age=0')
})

test('legacy public URLs redirect to pages with the Campground policy', async () => {
  for (const host of ['gabrielvaldivia.com', 'www.gabrielvaldivia.com']) {
    for (const [source, destination] of [['/engagement-models', '/working-together'], ['/photo', '/photos'], ['/photo/example', '/photos/example']]) {
      const redirect = await responseFor(source, host)
      assert.equal(redirect.status, 308)
      assert.equal(redirect.headers.get('location'), `https://${host}${destination}`)
      const { headers } = await responseFor(destination, host)
      assert.equal(headers.get('content-security-policy'), publicPolicy)
      assert.equal(headers.has('x-frame-options'), false)
    }
  }
})

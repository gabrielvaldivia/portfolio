import assert from 'node:assert/strict'
import test from 'node:test'
import { isReviewPath, publicPathname, reviewHref } from '../src/lib/reviewPaths'

test('review links retain project fragments and query parameters', () => {
  assert.equal(reviewHref('/'), '/dive')
  assert.equal(reviewHref('/work/daylight?view=all#module-image'), '/dive/work/daylight?view=all#module-image')
  assert.equal(reviewHref('/?view=all#about'), '/dive?view=all#about')
  assert.equal(reviewHref('https://www.gabrielvaldivia.com/work/dex#demo'), '/dive/work/dex#demo')
  assert.equal(reviewHref('https://gabrielvaldivia.com/about'), '/dive/about')
})

test('external links, assets, actions, and existing review links stay intact', () => {
  for (const href of [
    'https://daylightcomputer.com/', '//example.com/work', 'mailto:gabe@valdivia.works',
    'tel:+123456789', '#contact', '?photo=one', '/api/contact', '/admin', '/images/photo.jpg',
    '/notes/rss.xml', '/work/dex/index.md', '/dive', '/dive/work/daylight#demo',
  ]) assert.equal(reviewHref(href), href)
})

test('ordinary pages retain every original destination', () => {
  for (const href of ['/', '/work/daylight', 'https://www.gabrielvaldivia.com/about', '/dive']) {
    assert.equal(reviewHref(href, false), href)
  }
})

test('navigation recognizes review route boundaries without changing public paths', () => {
  assert.equal(publicPathname('/dive'), '/')
  assert.equal(publicPathname('/dive/work/daylight'), '/work/daylight')
  assert.equal(publicPathname('/diversity'), '/diversity')
  assert.equal(publicPathname('/work/daylight'), '/work/daylight')
  assert.equal(isReviewPath('/dive/work/daylight'), true)
  assert.equal(isReviewPath('/diversity'), false)
})

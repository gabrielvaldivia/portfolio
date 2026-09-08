import assert from 'node:assert/strict'
import test from 'node:test'

import {
  notesNavigationItem,
  orderSiteNavigationItems,
  photosNavigationItem,
} from '../src/lib/siteNavigation'

test('removes Playground, then places Notes after Work and Photos after Notes', () => {
  const items = orderSiteNavigationItems([
    { label: 'Home', url: '/' },
    { label: 'Work', url: '/work' },
    { label: 'Playground', url: '/playground' },
    { label: 'Clients', url: '/clients' },
  ])

  assert.deepEqual(items.map((item) => item.url), [
    '/',
    '/work',
    '/notes',
    '/photos',
    '/clients',
  ])
})

test('preserves saved collection positions', () => {
  const existingNotes = { id: 7, label: 'Writing', url: '/notes' }
  const existingPhotos = { id: 8, label: 'Photography', url: '/photos' }
  const items = orderSiteNavigationItems([
    existingPhotos,
    existingNotes,
    { id: 1, label: 'Home', url: '/' },
    { id: 2, label: 'Playground', url: '/playground' },
  ])

  assert.equal(items[0], existingPhotos)
  assert.equal(items[1], existingNotes)
  assert.equal(items.filter((item) => item.url === '/notes').length, 1)
  assert.equal(items.filter((item) => item.url === '/photos').length, 1)
  assert.equal(items.some((item) => item.url === '/playground'), false)
})

test('appends the collection fallbacks when Work is absent', () => {
  const items = orderSiteNavigationItems([{ label: 'Home', url: '/' }])

  assert.equal(items.at(-2), notesNavigationItem)
  assert.equal(items.at(-1), photosNavigationItem)
})

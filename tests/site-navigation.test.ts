import assert from 'node:assert/strict'
import test from 'node:test'

import { notesNavigationItem, orderSiteNavigationItems } from '../src/lib/siteNavigation'

test('places Notes after Playground', () => {
  const items = orderSiteNavigationItems([
    { label: 'Home', url: '/' },
    { label: 'Playground', url: '/playground' },
    { label: 'Clients', url: '/clients' },
  ])

  assert.deepEqual(items.map((item) => item.url), ['/', '/playground', '/notes', '/clients'])
})

test('preserves the saved position of an existing Notes item', () => {
  const existingNotes = { id: 7, label: 'Writing', url: '/notes' }
  const items = orderSiteNavigationItems([
    existingNotes,
    { id: 1, label: 'Home', url: '/' },
    { id: 2, label: 'Playground', url: '/playground' },
  ])

  assert.equal(items[0], existingNotes)
  assert.equal(items.filter((item) => item.url === '/notes').length, 1)
})

test('appends the Notes fallback when Playground is absent', () => {
  const items = orderSiteNavigationItems([{ label: 'Home', url: '/' }])

  assert.equal(items.at(-1), notesNavigationItem)
})

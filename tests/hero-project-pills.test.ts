import assert from 'node:assert/strict'
import test from 'node:test'
import { getHeroProjectPills } from '../src/lib/heroProjectPills'

test('lists project capabilities before its own client industry tags', () => {
  assert.deepEqual(getHeroProjectPills({
    services: [{ id: 1, title: 'Product Design' }, { id: 2, title: 'Branding' }],
    client: { name: 'Twinsi', tags: ['AI', 'Consumer'] },
  }), ['Product Design', 'Branding', 'AI', 'Consumer'])
})

test('trims and deduplicates labels while preserving authored order', () => {
  assert.deepEqual(getHeroProjectPills({
    services: [{ title: ' Product Design ' }, { title: 'product design' }, { title: '' }],
    client: { tags: [' AI ', 'ai', 'Consumer', ''] },
  }), ['Product Design', 'AI', 'Consumer'])
})

test('ignores missing data and unpopulated relationships without inventing pills', () => {
  assert.deepEqual(getHeroProjectPills({}), [])
  assert.deepEqual(getHeroProjectPills({ services: [1, '2', null, {}], client: 7 }), [])
  assert.deepEqual(getHeroProjectPills({ services: null, client: { tags: [false, null, 5] } }), [])
})

test('supports capabilities and industry tags independently', () => {
  assert.deepEqual(getHeroProjectPills({ services: [{ title: 'Strategy' }] }), ['Strategy'])
  assert.deepEqual(getHeroProjectPills({ client: { tags: ['Healthcare'] } }), ['Healthcare'])
})

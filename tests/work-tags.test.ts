import assert from 'node:assert/strict'
import test from 'node:test'
import { collectWorkTags, filterProjectsByTag, getProjectWorkTags, workTagSlug } from '../src/lib/workTags'

test('tag slugs are URL-safe', () => {
  assert.equal(workTagSlug(' Children Tech '), 'children-tech')
  assert.equal(workTagSlug('AI'), 'ai')
  assert.equal(workTagSlug('!!'), '')
})

test('reads project tags, trimming and deduplicating', () => {
  assert.deepEqual(getProjectWorkTags({ tags: [' AI ', 'ai', 'Consumer', '', 3] }), [
    { slug: 'ai', label: 'AI' },
    { slug: 'consumer', label: 'Consumer' },
  ])
  assert.deepEqual(getProjectWorkTags({ tags: null }), [])
  assert.deepEqual(getProjectWorkTags({}), [])
})

test('collects only tags in use, alphabetically', () => {
  const projects = [
    { tags: [{ slug: 'consumer', label: 'Consumer' }, { slug: 'ai', label: 'AI' }] },
    { tags: [{ slug: 'ai', label: 'AI' }] },
    { tags: [] },
  ]
  assert.deepEqual(collectWorkTags(projects).map(tag => tag.slug), ['ai', 'consumer'])
})

test('filters by tag slug and shows everything without one', () => {
  const projects = [
    { id: 1, tags: [{ slug: 'ai', label: 'AI' }] },
    { id: 2, tags: [{ slug: 'vr', label: 'VR' }] },
  ]
  assert.deepEqual(filterProjectsByTag(projects, 'vr').map(p => p.id), [2])
  assert.deepEqual(filterProjectsByTag(projects, null).map(p => p.id), [1, 2])
})

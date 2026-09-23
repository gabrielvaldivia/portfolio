import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CollectionConfig, GlobalConfig } from 'payload'
import { withContentRevalidation, withGlobalRevalidation } from '../src/lib/contentRevalidation'

function collection(slug: string, schedule: () => void) {
  return withContentRevalidation({ slug, fields: [] } as CollectionConfig, schedule)
}

test('publishing, editing, unpublishing and deleting notes refresh public content', async () => {
  let refreshes = 0
  const notes = collection('notes', () => { refreshes++ })
  const change = notes.hooks!.afterChange!.at(-1)!
  const published = { id: 1, _status: 'published', slug: 'old-title' }
  const renamed = { ...published, slug: 'new-title' }
  for (const [doc, previousDoc, context] of [
    [published, { _status: 'draft' }, {}],
    [renamed, published, {}],
    [{ ...renamed, _status: 'draft' }, renamed, { cancelNoteSchedule: true }],
  ]) {
    assert.equal(await change({ doc, previousDoc, context, req: {} } as any), doc)
  }
  await notes.hooks!.afterDelete!.at(-1)!({ doc: published, req: {} } as any)
  await notes.hooks!.afterDelete!.at(-1)!({ doc: { ...published, _status: 'draft' }, req: {} } as any)
  assert.equal(refreshes, 5)
})

test('draft autosaves, scheduling and newsletter markers do not invalidate published pages', async () => {
  let refreshes = 0
  const notes = collection('notes', () => { refreshes++ })
  const change = notes.hooks!.afterChange!.at(-1)!
  const draft = { _status: 'draft', scheduledFor: '2099-01-01' }
  await change({ doc: draft, previousDoc: { _status: 'published' }, context: {}, req: {} } as any)
  await change({ doc: draft, context: { cancelNoteSchedule: true }, req: {} } as any)
  await change({ doc: { _status: 'published' }, context: { skipNoteNewsletter: true }, req: {} } as any)
  assert.equal(refreshes, 0)
})

test('public content preserves existing hooks and invalidates on saves and deletions', async () => {
  let refreshes = 0
  const existing = async ({ doc }: any) => doc
  const pages = withContentRevalidation({ slug: 'pages', fields: [], hooks: { afterChange: [existing] } }, () => { refreshes++ })
  assert.equal(pages.hooks!.afterChange![0], existing)
  await pages.hooks!.afterChange!.at(-1)!({ doc: { status: 'draft' }, previousDoc: { status: 'published' }, req: {} } as any)
  await pages.hooks!.afterDelete!.at(-1)!({ doc: {}, req: {} } as any)
  const settings = withGlobalRevalidation({ slug: 'site-settings', fields: [] } as GlobalConfig, () => { refreshes++ })
  await settings.hooks!.afterChange!.at(-1)!({ doc: {}, req: {} } as any)
  assert.equal(refreshes, 3)
})

test('subscriber, account and conversation activity never invalidates the public site', () => {
  for (const slug of ['note-subscribers', 'users', 'conversations']) {
    const config = { slug, fields: [] } as CollectionConfig
    assert.equal(withContentRevalidation(config, () => assert.fail('unexpected invalidation')), config)
  }
})

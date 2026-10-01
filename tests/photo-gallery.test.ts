import assert from 'node:assert/strict'
import test from 'node:test'
import type { Payload } from 'payload'
import { findGalleryPhotos } from '../src/lib/photoGallery'

const upload = (value: unknown, relationTo = 'photos') => ({ type: 'upload', relationTo, value })
const body = (...children: unknown[]) => ({ root: { type: 'root', children } })

function fixture(savedBodies: unknown[], draftBodies: unknown[]) {
  const calls: any[] = []
  const payload = {
    find: async (options: any) => {
      calls.push(options)
      if (options.collection === 'notes') {
        assert.equal(options.overrideAccess, true, 'draft images must be excluded for anonymous visitors')
        assert.equal(options.pagination, false, 'notes beyond the first page must be included')
        assert.equal(options.depth, 0)
        assert.deepEqual(options.select, { body: true })
        return { docs: (options.draft ? draftBodies : savedBodies).map((body) => ({ body })) }
      }
      return { docs: [] }
    },
  } as unknown as Pick<Payload, 'find'>
  return { payload, calls }
}

test('excludes images in saved notes and latest drafts before the gallery limit is applied', async () => {
  const { payload, calls } = fixture(
    [body(upload(39), { type: 'paragraph', children: [upload({ id: 40 })] })],
    [body(upload(41), upload(39))],
  )
  await findGalleryPhotos(payload)
  const photos = calls.find((call) => call.collection === 'photos')
  assert.deepEqual(new Set(photos.where.id.not_in), new Set([39, 40, 41]))
  assert.equal(photos.limit, 500)
  assert.equal(photos.sort, '-captureDate')
  assert.deepEqual(calls.filter((call) => call.collection === 'notes').map((call) => call.draft), [false, true])
})

test('keeps gallery photos whose IDs only match Media uploads or ordinary note content', async () => {
  const { payload, calls } = fixture([
    body(upload(39, 'media'), { type: 'text', text: 'photos/39' }, { type: 'relationship', relationTo: 'photos', value: 40 }),
  ], [null, body(upload(null), upload({}), upload(false))])
  await findGalleryPhotos(payload)
  assert.equal(calls.find((call) => call.collection === 'photos').where, undefined)
})

test('handles string upload IDs nested in rich-text blocks and empty notes', async () => {
  const { payload, calls } = fixture([null, body({ type: 'block', fields: { content: body(upload('legacy-photo')) } })], [])
  await findGalleryPhotos(payload)
  assert.deepEqual(calls.find((call) => call.collection === 'photos').where.id.not_in, ['legacy-photo'])
})

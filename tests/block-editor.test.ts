import assert from 'node:assert/strict'
import test from 'node:test'
import {
  columnsForWidth,
  findDropTarget,
  moveDestination,
  rowsForHeight,
  unresolvedMediaIds,
  withResolvedMedia,
} from '../src/lib/blockEditor'

const grid = { left: 0, top: 0, right: 1280, bottom: 2000 }

test('drops above or below full-width modules and beside partial-width ones', () => {
  const cells = [
    { rect: { left: 0, top: 0, right: 1280, bottom: 400 }, fullWidth: true },
    { rect: { left: 0, top: 440, right: 620, bottom: 840 }, fullWidth: false },
    { rect: { left: 660, top: 440, right: 1280, bottom: 840 }, fullWidth: false },
  ]

  assert.equal(findDropTarget(500, 100, cells, grid).index, 0)
  assert.equal(findDropTarget(500, 300, cells, grid).index, 1)
  assert.equal(findDropTarget(100, 600, cells, grid).index, 1)
  assert.equal(findDropTarget(500, 600, cells, grid).index, 2)
  assert.equal(findDropTarget(1200, 600, cells, grid).bar.orientation, 'vertical')
  // Below everything snaps to after the nearest module.
  assert.equal(findDropTarget(1200, 1500, cells, grid).index, 3)
  assert.equal(findDropTarget(10, 10, [], grid).index, 0)
})

test('converts insertion points into Payload move destinations', () => {
  assert.equal(moveDestination(4, 0), 0)
  assert.equal(moveDestination(0, 3), 2)
  assert.equal(moveDestination(2, 3), 2)
})

test('snaps resize drags to the 6-column grid and 200px rows', () => {
  // 1280px grid with 40px gaps: each column is 180px.
  assert.equal(columnsForWidth(180, 1280), 1)
  assert.equal(columnsForWidth(620, 1280), 3)
  assert.equal(columnsForWidth(1280, 1280), 6)
  assert.equal(columnsForWidth(5000, 1280), 6)
  assert.equal(columnsForWidth(10, 1280), 1)
  assert.equal(rowsForHeight(200), 1)
  assert.equal(rowsForHeight(700), 3)
  assert.equal(rowsForHeight(9000), 6)
})

test('resolves media held by ID so the canvas can render it', () => {
  const blocks = [
    { blockType: 'image', image: 1 },
    { blockType: 'video', video: '2' },
    { blockType: 'browser', image: { id: 3, url: '/3.png' } },
    { blockType: 'text' },
  ]
  assert.deepEqual(unresolvedMediaIds(blocks, { 2: { id: 2, url: '/2.mp4' } }), ['1'])

  const resolved = withResolvedMedia(blocks, { 1: { id: 1, url: '/1.png' } })
  assert.deepEqual(resolved[0].image, { id: 1, url: '/1.png' })
  assert.equal(resolved[1].video, null)
  assert.deepEqual(resolved[2].image, { id: 3, url: '/3.png' })
})

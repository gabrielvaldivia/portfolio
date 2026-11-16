import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  advanceMarquee,
  getCircularMarqueeEntries,
  getMarqueeReleaseVelocity,
  getMarqueeRowExpansion,
  getMarqueeWindowSize,
  orderRightwardMarqueeItems,
  wrapMarqueePosition,
} from '../src/lib/marqueeMotion'

test('sizes the mounted card window to the viewport with a buffer', () => {
  assert.equal(getMarqueeWindowSize(390, 129), 6)
  assert.equal(getMarqueeWindowSize(1440, 129), 9)
  assert.equal(getMarqueeWindowSize(3840, 129), 16)
  assert.equal(getMarqueeWindowSize(1440, 5), 5)
  assert.equal(getMarqueeWindowSize(1440, 0), 0)
})

test('reads stable windows in both directions around a circular list', () => {
  const items = ['a', 'b', 'c', 'd']
  assert.deepEqual(getCircularMarqueeEntries(items, 3, 4), [
    { item: 'd', position: 3 },
    { item: 'a', position: 4 },
    { item: 'b', position: 5 },
    { item: 'c', position: 6 },
  ])
  assert.deepEqual(getCircularMarqueeEntries(items, -2, 3), [
    { item: 'c', position: -2 },
    { item: 'd', position: -1 },
    { item: 'a', position: 0 },
  ])
})

test('wraps both directions, including throws across multiple copies', () => {
  assert.equal(wrapMarqueePosition(-110, 100), -10)
  assert.equal(wrapMarqueePosition(10, 100), -90)
  assert.equal(wrapMarqueePosition(310, 100), -90)
  assert.equal(wrapMarqueePosition(-300, 100), 0)
  assert.equal(wrapMarqueePosition(0, 0), 0)
})

test('release velocity follows the recent gesture, not a loop seam', () => {
  assert.equal(getMarqueeReleaseVelocity([{ x: 200, time: 0 }, { x: 150, time: 50 }], 50), -1000)
  assert.equal(getMarqueeReleaseVelocity([{ x: 100, time: 0 }, { x: 150, time: 50 }], 50), 1000)
  assert.equal(getMarqueeReleaseVelocity([{ x: 100, time: 0 }, { x: 150, time: 50 }], 200), 0)
  assert.equal(getMarqueeReleaseVelocity([{ x: 0, time: 0 }, { x: 1000, time: 10 }], 10), 2400)
})

test('momentum decays in its thrown direction and smoothly returns to auto-scroll', () => {
  const coasting = advanceMarquee(1000, 0, 0.1, 0.5)
  assert.ok(coasting.distance > 0)
  assert.ok(coasting.velocity > 0 && coasting.velocity < 1000)
  const returning = advanceMarquee(coasting.velocity, -64, 0.1, 0.5)
  assert.ok(returning.distance > 0, 'does not reverse abruptly on pointer leave')
  assert.ok(returning.velocity < coasting.velocity)
  assert.ok(Math.abs(advanceMarquee(1000, -64, 10, 0.5).velocity + 64) < 0.01)
})

test('friction is independent of frame rate', () => {
  const full = advanceMarquee(1200, 0, 0.1, 0.5)
  const half = advanceMarquee(1200, 0, 0.05, 0.5)
  const secondHalf = advanceMarquee(half.velocity, 0, 0.05, 0.5)
  assert.ok(Math.abs(full.velocity - secondHalf.velocity) < 0.0001)
  assert.ok(Math.abs(full.distance - half.distance - secondHalf.distance) < 0.0001)
})

test('centers an expanded card and opens room beside it', () => {
  const slots = [0, 1, 2, 3].map((position) => ({ position, left: position * 120, width: 100 }))
  const row = getMarqueeRowExpansion(slots, 300, 200, 20, 1)
  assert.equal(row.expandedShift, 300 - 170)
  // The neighbors land one gap away from the expanded card's edges.
  assert.equal(0 + 100 + row.leftShift, 300 - 100 - 20)
  assert.equal(240 + row.rightShift, 300 + 100 + 20)
})

test('opens a matching gap in the other row around the center', () => {
  const slots = [0, 1, 2, 3].map((position) => ({ position, left: position * 120, width: 100 }))
  const row = getMarqueeRowExpansion(slots, 280, 200, 20)
  assert.equal(row.pivot, 2)
  assert.equal(120 + 100 + row.leftShift, 160)
  assert.equal(240 + row.rightShift, 400)
  assert.equal(row.expandedPosition, undefined)
})

test('puts top ranks at the end of a rightward row and next ranks before it', () => {
  const ordered = orderRightwardMarqueeItems(['1', '2', '3', '4', '5', '6'], 3)
  // The first window reads 3, 2, 1 left to right, so 1 starts at the right edge.
  assert.deepEqual(ordered.slice(0, 3), ['3', '2', '1'])
  // Wrapping left from the window continues down the ranks: 4, 5, 6.
  assert.deepEqual(getCircularMarqueeEntries(ordered, -3, 3).map(({ item }) => item), ['6', '5', '4'])
})

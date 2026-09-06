import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSheetDestination } from '../src/lib/bottomSheet'

test('upward swipe expands the sheet', () => {
  assert.equal(getSheetDestination(false, -90, -200), 'full')
  assert.equal(getSheetDestination(false, -20, -600), 'full')
})

test('downward swipe dismisses at either height', () => {
  for (const expanded of [false, true]) {
    assert.equal(getSheetDestination(expanded, 100, 100), 'closed')
    assert.equal(getSheetDestination(expanded, 20, 700), 'closed')
  }
})

test('small movements and taps stay at the current snap point', () => {
  assert.equal(getSheetDestination(false, 4, 1000), 'partial')
  assert.equal(getSheetDestination(false, -4, -1000), 'partial')
  assert.equal(getSheetDestination(false, 30, 80), 'partial')
  assert.equal(getSheetDestination(true, -90, -200), 'full')
  assert.equal(getSheetDestination(true, 30, 80), 'full')
})

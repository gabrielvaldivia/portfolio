import assert from 'node:assert/strict'
import test from 'node:test'
import { formatActivityTime } from '../src/lib/activityTime'

const now = Date.parse('2026-09-06T12:00:00Z')
const minute = 60_000
const hour = 60 * minute
const day = 24 * hour
const ago = (elapsed: number) => new Date(now - elapsed).toISOString()

test('recent activity uses compact minutes, hours, and days', () => {
  for (const [elapsed, expected] of [
    [0, 'now'], [59_999, 'now'], [minute, '1m'], [2 * minute, '2m'],
    [hour - 1, '59m'], [hour, '1h'], [2 * hour, '2h'],
    [day - 1, '23h'], [day, '1d'], [2 * day, '2d'], [7 * day - 1, '6d'],
  ] as const) {
    assert.equal(formatActivityTime(ago(elapsed), now), expected)
  }
})

test('older activity retains an unambiguous calendar date', () => {
  assert.equal(formatActivityTime(ago(7 * day), now), 'Aug 30, 2026')
  assert.equal(formatActivityTime('2025-01-01T01:00:00Z', now), 'Dec 31, 2024')
})

test('invalid timestamps and clock skew are handled', () => {
  assert.equal(formatActivityTime('invalid', now), '')
  assert.equal(formatActivityTime(ago(-minute), now), 'now')
})

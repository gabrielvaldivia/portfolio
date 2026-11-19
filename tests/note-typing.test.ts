import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTypingSchedule, warpTypingTime } from '../src/lib/noteTyping'

test('short notes type at natural speed', () => {
  const { total } = buildTypingSchedule('Hello there.', new Set())
  assert.ok(total < 8000)
  assert.equal(warpTypingTime(100, total), 100)
  assert.equal(warpTypingTime(total, total), Infinity)
})

test('long notes accelerate and finish within eight seconds', () => {
  const { times, total } = buildTypingSchedule('word '.repeat(4000), new Set())
  assert.ok(total > 8000)
  // The first moments stay close to natural pace.
  assert.ok(warpTypingTime(500, total) < 1000)
  assert.equal(warpTypingTime(8000, total), Infinity)
  let previous = 0
  for (let elapsed = 0; elapsed < 8000; elapsed += 250) {
    const natural = warpTypingTime(elapsed, total)
    assert.ok(natural >= previous)
    previous = natural
  }
  assert.ok(times.every((time, index) => index === 0 || time > times[index - 1]))
})

test('punctuation and block breaks add pauses', () => {
  const plain = buildTypingSchedule('ab', new Set())
  const paused = buildTypingSchedule('a.b', new Set([2]))
  assert.ok(paused.times[2] - paused.times[1] > 180)
  assert.ok(plain.total < paused.total)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { observeHeroTrackpadNavigation } from '../src/lib/observeHeroTrackpadNavigation'

function setup() {
  const target = Object.assign(new EventTarget(), { clientWidth: 1200, clientHeight: 675 })
  const changes: string[] = []
  const stop = observeHeroTrackpadNavigation(target as unknown as HTMLElement,
    () => changes.push('previous'), () => changes.push('next'))
  let time = 0
  const wheel = (deltaX: number, deltaY = 0, options: {
    gap?: number; deltaMode?: number; ctrlKey?: boolean; metaKey?: boolean; prevented?: boolean
  } = {}) => {
    time += options.gap ?? 16
    const event = new Event('wheel', { cancelable: true })
    Object.defineProperties(event, Object.fromEntries(Object.entries({
      deltaX, deltaY, deltaMode: options.deltaMode ?? 0,
      ctrlKey: options.ctrlKey ?? false, metaKey: options.metaKey ?? false, timeStamp: time,
    }).map(([key, value]) => [key, { value }])))
    if (options.prevented) event.preventDefault()
    target.dispatchEvent(event)
    return event.defaultPrevented
  }
  return { changes, wheel, stop }
}

test('a trackpad swipe advances once and consumes its long momentum tail', () => {
  const { changes, wheel } = setup()
  wheel(3)
  assert.deepEqual(changes, [])
  for (const delta of [12, 20, 30, 70, 50, 32, 20, 10, 4, 1]) {
    assert.equal(wheel(delta, 1, { gap: 100 }), true)
  }
  assert.deepEqual(changes, ['next'])
})

test('a new swipe can go back, or advance again in the same direction', () => {
  const { changes, wheel } = setup()
  wheel(80)
  wheel(80, 0, { gap: 250 })
  wheel(-80, 0, { gap: 250 })
  assert.deepEqual(changes, ['next', 'next', 'previous'])
})

test('vertical and vertical-dominant gestures retain native page scrolling', () => {
  const { changes, wheel } = setup()
  assert.equal(wheel(0, 90), false)
  assert.equal(wheel(25, 70, { gap: 250 }), false)
  assert.equal(wheel(150, 2), false, 'sideways momentum cannot take over a vertical gesture')
  assert.deepEqual(changes, [])
  assert.equal(wheel(70, 8, { gap: 250 }), true)
  assert.deepEqual(changes, ['next'])
})

test('tiny unrelated movements do not accumulate across gestures', () => {
  const { changes, wheel } = setup()
  for (let index = 0; index < 10; index++) wheel(10, 0, { gap: 250 })
  assert.deepEqual(changes, [])
})

test('pinch zoom and already handled events do not navigate', () => {
  const { changes, wheel } = setup()
  assert.equal(wheel(100, 0, { ctrlKey: true }), false)
  assert.equal(wheel(-100, 0, { metaKey: true }), false)
  wheel(100, 0, { prevented: true })
  assert.deepEqual(changes, [])
})

test('line and page wheel input also navigate in the expected direction', () => {
  const { changes, wheel } = setup()
  wheel(3, 0, { deltaMode: 1 })
  wheel(-1, 0, { deltaMode: 2, gap: 250 })
  assert.deepEqual(changes, ['next', 'previous'])
})

test('cleanup removes the listener without consuming later scrolling', () => {
  const { changes, wheel, stop } = setup()
  stop()
  assert.equal(wheel(100), false)
  assert.deepEqual(changes, [])
})

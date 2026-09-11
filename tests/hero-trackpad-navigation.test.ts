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

test('horizontal input is consumed from the first pixels before navigation starts', () => {
  const { changes, wheel } = setup()
  assert.equal(wheel(2), true)
  assert.equal(wheel(3), true)
  assert.deepEqual(changes, [])
  wheel(50)
  assert.deepEqual(changes, ['next'])
})

test('a new swipe can go back, or advance again in the same direction', () => {
  const { changes, wheel } = setup()
  wheel(80)
  wheel(80, 0, { gap: 250 })
  wheel(-80, 0, { gap: 250 })
  assert.deepEqual(changes, ['next', 'next', 'previous'])
})

test('a deliberate reverse swipe responds before the old momentum stops', () => {
  const { changes, wheel } = setup()
  wheel(80)
  wheel(35)
  wheel(-12)
  wheel(-18)
  wheel(-25)
  assert.deepEqual(changes, ['next', 'previous'])
  for (const delta of [-60, -40, -20, -5]) wheel(delta)
  assert.deepEqual(changes, ['next', 'previous'], 'reverse momentum advances only once')
})

test('another same-direction swipe responds during a decaying momentum tail', () => {
  const { changes, wheel } = setup()
  for (const delta of [20, 35, 70, 40, 20, 4, 12, 22, 40, 60, 35, 10]) wheel(delta)
  assert.deepEqual(changes, ['next', 'next'])
})

test('small momentum reversals do not rearm the same swipe', () => {
  const { changes, wheel } = setup()
  for (const delta of [80, 30, -2, -3, 20, 10, 2]) wheel(delta)
  assert.deepEqual(changes, ['next'])
})

test('horizontal swipes work immediately after scrolling down to the slideshow', () => {
  const { changes, wheel } = setup()
  wheel(0, 90)
  wheel(0, 40)
  wheel(25, 2)
  assert.equal(wheel(30, 1), true)
  assert.deepEqual(changes, ['next'])
  assert.equal(wheel(0, 90), false, 'vertical page scrolling responds immediately')
  assert.equal(wheel(0, 50), false)
  assert.deepEqual(changes, ['next'])
})

test('vertical and vertical-dominant gestures retain native page scrolling', () => {
  const { changes, wheel } = setup()
  assert.equal(wheel(0, 90), false)
  assert.equal(wheel(25, 70, { gap: 250 }), false)
  assert.equal(wheel(150, 2), true, 'sideways momentum is consumed without changing slides')
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

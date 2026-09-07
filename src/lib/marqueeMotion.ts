export type DragSample = { x: number; time: number }

export type MarqueeWindowEntry<T> = {
  item: T
  position: number
}

/** Keep enough cards mounted to cover the viewport plus a generous buffer. */
export function getMarqueeWindowSize(viewportWidth: number, itemCount: number) {
  if (itemCount <= 0) return 0

  const cardHeight = viewportWidth >= 1280 ? 315 : viewportWidth >= 810 ? 288 : 216
  const gap = viewportWidth >= 810 ? 24 : 20
  const bufferedCardCount = Math.ceil(Math.max(0, viewportWidth) / (cardHeight + gap)) + 4

  return Math.min(itemCount, Math.max(6, bufferedCardCount))
}

/** Return stable logical positions while reading items as a circular list. */
export function getCircularMarqueeEntries<T>(
  items: T[],
  start: number,
  count: number,
): MarqueeWindowEntry<T>[] {
  if (!items.length || count <= 0) return []

  return Array.from({ length: count }, (_, offset) => {
    const position = start + offset
    const index = ((position % items.length) + items.length) % items.length
    return { item: items[index], position }
  })
}

/** Keep either direction of travel inside the two identical track copies. */
export function wrapMarqueePosition(position: number, distance: number) {
  if (distance <= 0) return 0
  const offset = ((-position % distance) + distance) % distance
  return offset === 0 ? 0 : -offset
}

export function getMarqueeReleaseVelocity(samples: DragSample[], releasedAt: number) {
  const recent = samples.filter((sample) => releasedAt - sample.time <= 100)
  if (recent.length < 2) return 0
  const first = recent[0]
  const last = recent[recent.length - 1]
  const elapsed = releasedAt - first.time
  if (elapsed <= 0) return 0
  return Math.max(-2400, Math.min(2400, (last.x - first.x) * 1000 / elapsed))
}

/** Integrate friction, so the throw and return to auto-scroll share one motion. */
export function advanceMarquee(velocity: number, target: number, seconds: number, decay: number) {
  const remaining = Math.exp(-seconds / decay)
  return {
    velocity: target + (velocity - target) * remaining,
    distance: target * seconds + (velocity - target) * decay * (1 - remaining),
  }
}

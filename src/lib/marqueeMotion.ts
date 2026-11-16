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

export type MarqueeSlotMeasure = {
  position: number
  left: number
  width: number
}

/** How a row's cards shift while one card is expanded across both rows. */
export type MarqueeRowExpansion = {
  pivot: number
  leftShift: number
  rightShift: number
  expandedPosition?: number
  expandedShift?: number
  /** Pixel size of the expanded card, plus its inset from the far edge of the two-row span. */
  expandedSize?: { width: number; height: number; inset: number }
}

/**
 * Center the expanded card and open a matching gap in every row.
 * Cards before the pivot move as one group, cards after it as another,
 * so cards outside the measured window keep their spacing.
 */
export function getMarqueeRowExpansion(
  slots: MarqueeSlotMeasure[],
  center: number,
  expandedWidth: number,
  gap: number,
  expandedPosition?: number,
): MarqueeRowExpansion {
  const sorted = [...slots].sort((a, b) => a.position - b.position)
  const leftEdge = center - expandedWidth / 2 - gap
  const rightEdge = center + expandedWidth / 2 + gap

  if (expandedPosition !== undefined) {
    const index = sorted.findIndex((slot) => slot.position === expandedPosition)
    const expanded = sorted[index]
    if (!expanded) return { pivot: expandedPosition, leftShift: 0, rightShift: 0 }
    const before = sorted[index - 1]
    const after = sorted[index + 1]
    const expandedShift = center - (expanded.left + expanded.width / 2)
    return {
      pivot: expandedPosition,
      expandedPosition,
      expandedShift,
      leftShift: before ? leftEdge - (before.left + before.width) : expandedShift,
      rightShift: after ? rightEdge - after.left : expandedShift,
    }
  }

  const pivotIndex = sorted.findIndex((slot) => slot.left + slot.width / 2 >= center)
  const before = sorted[(pivotIndex === -1 ? sorted.length : pivotIndex) - 1]
  const after = pivotIndex === -1 ? undefined : sorted[pivotIndex]
  return {
    pivot: after ? after.position : (before?.position ?? 0) + 1,
    leftShift: before ? leftEdge - (before.left + before.width) : 0,
    rightShift: after ? rightEdge - after.left : 0,
  }
}

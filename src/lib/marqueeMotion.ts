export type DragSample = { x: number; time: number }

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

/** Treat a horizontal wheel gesture, including its momentum, as one slide change. */
export function observeHeroTrackpadNavigation(
  slideshow: HTMLElement,
  showPrevious: () => void,
  showNext: () => void,
) {
  let lastEventTime = -Infinity
  let horizontalDistance = 0
  let verticalDistance = 0
  let axis: 'x' | 'y' | null = null
  let navigated = false

  const handleWheel = (event: WheelEvent) => {
    // Trackpad pinch-to-zoom uses Ctrl+wheel. Leave zoom and handled input alone.
    if (event.ctrlKey || event.metaKey || event.defaultPrevented) return

    if (event.timeStamp - lastEventTime > 200) {
      horizontalDistance = 0
      verticalDistance = 0
      axis = null
      navigated = false
    }
    lastEventTime = event.timeStamp

    // Wheel deltas can be pixels (0), lines (1), or pages (2).
    const unitX = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? slideshow.clientWidth : 1
    const unitY = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? slideshow.clientHeight : 1
    horizontalDistance += event.deltaX * unitX
    verticalDistance += event.deltaY * unitY

    // Ignore tiny initial jitter, then keep vertical page scrolling in control
    // for the entire gesture, even if its momentum drifts sideways.
    if (!axis && Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) >= 8) {
      axis = Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'x' : 'y'
    }
    if (axis !== 'x') return

    event.preventDefault()
    if (navigated || Math.abs(horizontalDistance) < 48) return
    navigated = true
    if (horizontalDistance > 0) showNext()
    else showPrevious()
  }

  slideshow.addEventListener('wheel', handleWheel, { passive: false })
  return () => slideshow.removeEventListener('wheel', handleWheel)
}

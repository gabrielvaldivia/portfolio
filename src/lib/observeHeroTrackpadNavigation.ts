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
  let previousMagnitude = 0
  let deceleratingEvents = 0
  let reverseDistance = 0
  let crossAxisDistance = 0
  let crossAxisEvents = 0

  const resetGesture = () => {
    horizontalDistance = 0
    verticalDistance = 0
    axis = null
    navigated = false
    previousMagnitude = 0
    deceleratingEvents = 0
    reverseDistance = 0
    crossAxisDistance = 0
    crossAxisEvents = 0
  }

  const handleWheel = (event: WheelEvent) => {
    // Trackpad pinch-to-zoom uses Ctrl+wheel. Leave zoom and handled input alone.
    if (event.ctrlKey || event.metaKey || event.defaultPrevented) return

    if (event.timeStamp - lastEventTime > 200) resetGesture()
    lastEventTime = event.timeStamp

    // Wheel deltas can be pixels (0), lines (1), or pages (2).
    const unitX = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? slideshow.clientWidth : 1
    const unitY = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? slideshow.clientHeight : 1
    const deltaX = event.deltaX * unitX
    const deltaY = event.deltaY * unitY
    const eventAxis = Math.abs(deltaX) === Math.abs(deltaY)
      ? axis ?? 'y'
      : Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'

    // Claim horizontal input from its first event, before the slide threshold,
    // so the browser cannot start its own horizontal scroll or history swipe.
    if (eventAxis === 'x') event.preventDefault()

    // A deliberate change of axis can start before the old momentum ends.
    // Require sustained movement so a single sideways tail event is ignored.
    if (axis && eventAxis !== axis) {
      crossAxisDistance += eventAxis === 'x' ? deltaX : deltaY
      crossAxisEvents += 1
      if (crossAxisEvents < 2 || Math.abs(crossAxisDistance) < 48) return
      const distance = crossAxisDistance
      resetGesture()
      axis = eventAxis
      if (axis === 'x') horizontalDistance = distance - deltaX
      else verticalDistance = distance - deltaY
    } else {
      crossAxisDistance = 0
      crossAxisEvents = 0
    }

    if (axis === 'x' && navigated) {
      if (deltaX * horizontalDistance < 0) {
        reverseDistance += deltaX
        if (Math.abs(reverseDistance) < 48) {
          event.preventDefault()
          return
        }
        const distance = reverseDistance
        resetGesture()
        horizontalDistance = distance - deltaX
      } else {
        reverseDistance = 0
        // Renewed acceleration after a decaying tail signals another swipe.
        // The original swipe's rising deltas still count as one gesture.
        if (deceleratingEvents >= 2 && Math.abs(deltaX) >= 8 && Math.abs(deltaX) > previousMagnitude * 1.8) {
          resetGesture()
        }
      }
    }

    horizontalDistance += deltaX
    verticalDistance += deltaY

    // Ignore tiny initial jitter before choosing the gesture's axis.
    if (!axis && Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) >= 8) {
      axis = Math.abs(horizontalDistance) > Math.abs(verticalDistance) ? 'x' : 'y'
    }
    if (axis !== 'x') return

    const magnitude = Math.abs(deltaX)
    deceleratingEvents = magnitude < previousMagnitude ? deceleratingEvents + 1 : 0
    previousMagnitude = magnitude
    event.preventDefault()
    if (navigated || Math.abs(horizontalDistance) < 48) return
    navigated = true
    if (horizontalDistance > 0) showNext()
    else showPrevious()
  }

  slideshow.addEventListener('wheel', handleWheel, { passive: false })
  return () => slideshow.removeEventListener('wheel', handleWheel)
}

/**
 * Loop a full-width horizontal carousel continuously.
 *
 * Every horizontal movement is driven here: drags follow the finger, and
 * releases, taps (left half back, right half forward), arrow keys and
 * `scrollToStep` animate scrollLeft frame by frame. The carousel has no CSS
 * scroll snapping and never uses native smooth scrolling, because Safari on
 * iPhone runs both in a separate process where they can stop short between
 * slides. Whatever stops a scroll mid-turn, the carousel then finishes it.
 * The selected slide is reported once it has landed, so a turn runs without
 * React work.
 */
export function observeLoopingHeroCarousel(
  carousel: HTMLElement,
  count: number,
  initialIndex: number,
  onIndexChange: (index: number) => void,
  onManualNavigation: () => void,
  /** Called right after each animation frame moves the carousel. */
  onFrame?: () => void,
) {
  const offset = count > 1 ? 1 : 0
  const lastPage = count - 1 + offset * 2
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = carousel.clientWidth
  let currentIndex = initialIndex
  let reportedIndex = initialIndex
  let lastScrollAt = 0
  let interacting = false
  let pointerId: number | null = null
  let suppressClick = false
  // Where the latest turn is heading, so rapid taps keep advancing mid-turn.
  let targetPage: number | null = null
  let animationFrame: number | null = null
  const originalCursor = carousel.style.cursor
  let gesture: {
    x: number
    y: number
    lastX: number
    startLeft: number
    scale: number
    axis: 'x' | 'y' | null
    tappable: boolean
  } | null = null
  let settleTimeout: ReturnType<typeof setTimeout> | undefined

  const clampPage = (page: number) => Math.max(0, Math.min(lastPage, page))
  const setLeft = (left: number) => carousel.scrollTo({ left, behavior: 'instant' })
  const alignSelectedSlide = () => setLeft((currentIndex + offset) * width)
  const stopAnimation = () => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  const scheduleSettle = () => {
    clearTimeout(settleTimeout)
    // Also covers browsers without scrollend.
    settleTimeout = setTimeout(settle, 180)
  }
  const animateTo = (page: number) => {
    stopAnimation()
    clearTimeout(settleTimeout)
    targetPage = clampPage(page)
    const from = carousel.scrollLeft
    const to = targetPage * width
    if (reducedMotion.matches || Math.abs(to - from) < 0.5) {
      setLeft(to)
      onFrame?.()
      settle()
      return
    }
    const distance = Math.abs(to - from) / width
    const duration = Math.min(650, 160 + 260 * Math.sqrt(distance))
    const start = performance.now()
    let expectedLeft = from
    const step = (now: number) => {
      // Something else scrolled the carousel (another script, assistive
      // technology): let that win, and settle once it stops.
      if (Math.abs(carousel.scrollLeft - expectedLeft) > 1) {
        animationFrame = null
        targetPage = null
        scheduleSettle()
        return
      }
      const progress = Math.min(1, Math.max(0, (now - start) / duration))
      // Ease out, like a cube that was pushed and comes to rest.
      expectedLeft = from + (to - from) * (1 - (1 - progress) ** 3)
      setLeft(expectedLeft)
      expectedLeft = carousel.scrollLeft
      onFrame?.()
      if (progress < 1) {
        animationFrame = requestAnimationFrame(step)
        return
      }
      animationFrame = null
      settle()
    }
    animationFrame = requestAnimationFrame(step)
  }
  /** Turn one slide, continuing from any turn already under way. */
  const turn = (direction: 1 | -1) => {
    if (!offset || !width) return
    let page = (targetPage ?? Math.round(carousel.scrollLeft / width)) + direction
    const distance = count * width
    // Past a duplicate, continue from its identical real slide.
    if (page > lastPage && carousel.scrollLeft >= distance) {
      stopAnimation()
      setLeft(carousel.scrollLeft - distance)
      page -= count
    } else if (page < 0 && carousel.scrollLeft <= width) {
      stopAnimation()
      setLeft(carousel.scrollLeft + distance)
      page += count
    }
    onManualNavigation()
    animateTo(page)
  }
  function settle() {
    if (interacting || animationFrame !== null || !width) return
    const page = carousel.scrollLeft / width
    const nearest = Math.round(page)
    if (Math.abs(page - nearest) >= 0.01) {
      // Wheel or keyboard scrolling may still be moving; only finish a
      // scroll that has stopped.
      if (performance.now() - lastScrollAt < 150) scheduleSettle()
      else animateTo(nearest)
      return
    }
    targetPage = null
    currentIndex = ((nearest - offset) % count + count) % count
    // Only jump once a duplicate is fully in place. Its matching real slide
    // looks identical, so the next swipe can continue in either direction.
    if (offset && (nearest === 0 || nearest === lastPage)) {
      alignSelectedSlide()
      onFrame?.()
    }
    if (currentIndex !== reportedIndex) {
      reportedIndex = currentIndex
      onIndexChange(currentIndex)
    }
  }
  const handleScroll = () => {
    lastScrollAt = performance.now()
    if (animationFrame === null && !interacting) scheduleSettle()
  }
  const handleScrollEnd = (event: Event) => {
    if (event.target === carousel) settle()
  }
  const startGesture = (x: number, y: number, target: EventTarget | null) => {
    // Freeze any turn under way where it is; the finger takes over from there.
    stopAnimation()
    clearTimeout(settleTimeout)
    interacting = true
    suppressClick = false
    gesture = {
      x,
      y,
      lastX: x,
      startLeft: carousel.scrollLeft,
      scale: carousel.getBoundingClientRect().width / width || 1,
      axis: null,
      tappable: !(target instanceof Element && target.closest('a, button')),
    }
  }
  const moveGesture = (x: number, y: number) => {
    if (!gesture) return false
    const deltaX = gesture.x - x
    const deltaY = gesture.y - y
    if (!gesture.axis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return false
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      targetPage = null
      if (gesture.axis === 'x') onManualNavigation()
    }
    if (gesture.axis !== 'x') return false
    suppressClick = true
    gesture.lastX = x
    let left = gesture.startLeft + deltaX / gesture.scale
    if (offset) {
      const distance = count * width
      // Both copies share the same last→first transition. Shift the drag's
      // origin with the scroll position so it keeps following the finger.
      const shift = left < width / 2 ? distance : left > distance + width / 2 ? -distance : 0
      left += shift
      gesture.startLeft += shift
    } else left = 0
    setLeft(left)
    return true
  }
  const finishGesture = (canTap: boolean) => {
    interacting = false
    const completed = gesture
    gesture = null
    if (completed?.axis === 'x') {
      let page = Math.round(carousel.scrollLeft / width)
      const delta = (completed.x - completed.lastX) / completed.scale
      if (Math.abs(delta) > 40) {
        page = delta > 0
          ? Math.max(page, Math.floor(completed.startLeft / width) + 1)
          : Math.min(page, Math.ceil(completed.startLeft / width) - 1)
      }
      animateTo(page)
      return
    }
    if (completed && canTap && completed.tappable && !completed.axis && offset) {
      const bounds = carousel.getBoundingClientRect()
      turn(completed.x - bounds.left < bounds.width / 2 ? -1 : 1)
      return
    }
    // A vertical scroll or a cancelled touch may have frozen a turn mid-way.
    targetPage = null
    settle()
  }
  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      // A second finger makes this a pinch, not a tap.
      if (gesture) gesture.tappable = false
      return
    }
    // One finger down means any earlier touch has ended, even if its touchend
    // never arrived; finish that gesture so it cannot hold the carousel.
    if (gesture) finishGesture(false)
    if (!width) return
    startGesture(event.touches[0].clientX, event.touches[0].clientY, event.target)
  }
  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 1 && moveGesture(event.touches[0].clientX, event.touches[0].clientY)) {
      event.preventDefault()
    }
  }
  const handleTouchEnd = (event: TouchEvent) => {
    if (!event.touches.length) finishGesture(true)
  }
  const handleTouchCancel = () => finishGesture(false)
  const handlePointerDown = (event: PointerEvent) => {
    // Touch keeps the existing gesture path; pointers also support mobile previews.
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0 || !width) return
    pointerId = event.pointerId
    startGesture(event.clientX, event.clientY, event.target)
  }
  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || !moveGesture(event.clientX, event.clientY)) return
    event.preventDefault()
    if (!carousel.hasPointerCapture(event.pointerId)) carousel.setPointerCapture(event.pointerId)
    carousel.style.cursor = 'grabbing'
  }
  const handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    pointerId = null
    finishGesture(event.type === 'pointerup')
    carousel.style.cursor = originalCursor
    if (carousel.hasPointerCapture(event.pointerId)) carousel.releasePointerCapture(event.pointerId)
  }
  const handleClick = (event: MouseEvent) => {
    if (!suppressClick || event.detail === 0) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }
  const handleDragStart = (event: DragEvent) => {
    if (gesture) event.preventDefault()
  }
  const handleWheel = (event: WheelEvent) => {
    if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
    // The wheel scrolls natively; settle finishes the turn once it stops.
    stopAnimation()
    targetPage = null
    onManualNavigation()
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      turn(event.key === 'ArrowRight' ? 1 : -1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      onManualNavigation()
      animateTo(event.key === 'Home' ? offset : count - 1 + offset)
    }
  }

  alignSelectedSlide()
  const resizeObserver = new ResizeObserver(() => {
    const nextWidth = carousel.clientWidth
    if (!nextWidth || nextWidth === width) return
    width = nextWidth
    stopAnimation()
    targetPage = null
    alignSelectedSlide()
  })
  resizeObserver.observe(carousel)
  carousel.addEventListener('scroll', handleScroll, { passive: true })
  carousel.addEventListener('scrollend', handleScrollEnd)
  carousel.addEventListener('touchstart', handleTouchStart, { passive: false })
  carousel.addEventListener('touchmove', handleTouchMove, { passive: false })
  carousel.addEventListener('touchend', handleTouchEnd, { passive: true })
  carousel.addEventListener('touchcancel', handleTouchCancel, { passive: true })
  carousel.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerEnd)
  window.addEventListener('pointercancel', handlePointerEnd)
  carousel.addEventListener('lostpointercapture', handlePointerEnd)
  carousel.addEventListener('click', handleClick, true)
  carousel.addEventListener('dragstart', handleDragStart)
  carousel.addEventListener('wheel', handleWheel, { passive: true })
  carousel.addEventListener('keydown', handleKeyDown)

  return {
    /** Animate to a slide; `count` is the copy of the first slide after the last. */
    scrollToStep(step: number) {
      animateTo(Math.max(0, Math.min(count, step)) + offset)
    },
    stop() {
      stopAnimation()
      clearTimeout(settleTimeout)
      resizeObserver.disconnect()
      carousel.removeEventListener('scroll', handleScroll)
      carousel.removeEventListener('scrollend', handleScrollEnd)
      carousel.removeEventListener('touchstart', handleTouchStart)
      carousel.removeEventListener('touchmove', handleTouchMove)
      carousel.removeEventListener('touchend', handleTouchEnd)
      carousel.removeEventListener('touchcancel', handleTouchCancel)
      const capturedPointerId = pointerId
      pointerId = null
      if (capturedPointerId !== null && carousel.hasPointerCapture(capturedPointerId)) carousel.releasePointerCapture(capturedPointerId)
      carousel.style.cursor = originalCursor
      carousel.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
      carousel.removeEventListener('lostpointercapture', handlePointerEnd)
      carousel.removeEventListener('click', handleClick, true)
      carousel.removeEventListener('dragstart', handleDragStart)
      carousel.removeEventListener('wheel', handleWheel)
      carousel.removeEventListener('keydown', handleKeyDown)
    },
  }
}

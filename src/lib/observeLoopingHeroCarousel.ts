/** Loop horizontal drags continuously, keeping native scrolling for other input. */
export function observeLoopingHeroCarousel(
  carousel: HTMLElement,
  count: number,
  initialIndex: number,
  onIndexChange: (index: number) => void,
  onManualNavigation: () => void,
) {
  const offset = count > 1 ? 1 : 0
  let width = carousel.clientWidth
  let currentIndex = initialIndex
  let interacting = false
  let pointerId: number | null = null
  let suppressClick = false
  const originalCursor = carousel.style.cursor
  let gesture: {
    x: number
    y: number
    lastX: number
    startLeft: number
    scale: number
    snapType: string
    axis: 'x' | 'y' | null
  } | null = null
  let settleTimeout: ReturnType<typeof setTimeout> | undefined

  const alignSelectedSlide = () => {
    carousel.scrollTo({ left: (currentIndex + offset) * width, behavior: 'instant' })
  }
  const settle = () => {
    if (interacting || !offset || !width) return
    const page = carousel.scrollLeft / width
    // Only jump once a duplicate is fully in place. Its matching real slide
    // looks identical, so the next swipe can continue in either direction.
    if (Math.abs(page) < 0.01 || Math.abs(page - count - 1) < 0.01) {
      currentIndex = page < 1 ? count - 1 : 0
      onIndexChange(currentIndex)
      alignSelectedSlide()
    }
  }
  const scheduleSettle = () => {
    clearTimeout(settleTimeout)
    // Also supports Safari versions without scrollend.
    settleTimeout = setTimeout(settle, 180)
  }
  const handleScroll = () => {
    if (!width) return
    const page = Math.round(carousel.scrollLeft / width)
    const index = ((page - offset) % count + count) % count
    if (index !== currentIndex) {
      currentIndex = index
      onIndexChange(index)
    }
    scheduleSettle()
  }
  const handleScrollEnd = (event: Event) => {
    if (event.target === carousel) settle()
  }
  const startGesture = (x: number, y: number) => {
    clearTimeout(settleTimeout)
    interacting = true
    suppressClick = false
    const left = carousel.scrollLeft
    gesture = {
      x,
      y,
      lastX: x,
      startLeft: left,
      scale: carousel.getBoundingClientRect().width / width || 1,
      snapType: carousel.style.scrollSnapType,
      axis: null,
    }
    // Stop the previous snap at its current position. Horizontal touch panning
    // is handled below, so browser momentum cannot race a loop rebase.
    carousel.style.scrollSnapType = 'none'
    carousel.scrollTo({ left, behavior: 'instant' })
  }
  const moveGesture = (x: number, y: number) => {
    if (!gesture) return false
    const deltaX = gesture.x - x
    const deltaY = gesture.y - y
    if (!gesture.axis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return false
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      if (gesture.axis === 'x') onManualNavigation()
      else carousel.style.scrollSnapType = gesture.snapType
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
    carousel.scrollTo({ left, behavior: 'instant' })
    return true
  }
  const finishGesture = () => {
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
      carousel.style.scrollSnapType = completed.snapType
      carousel.scrollTo({
        left: Math.max(0, Math.min(count - 1 + offset * 2, page)) * width,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      })
    } else if (completed) carousel.style.scrollSnapType = completed.snapType
    scheduleSettle()
  }
  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || !width) return
    startGesture(event.touches[0].clientX, event.touches[0].clientY)
  }
  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 1 && moveGesture(event.touches[0].clientX, event.touches[0].clientY)) {
      event.preventDefault()
    }
  }
  const handlePointerDown = (event: PointerEvent) => {
    // Touch keeps the existing gesture path; pointers also support mobile previews.
    if (event.pointerType === 'touch' || !event.isPrimary || event.button !== 0 || !width) return
    pointerId = event.pointerId
    startGesture(event.clientX, event.clientY)
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
    finishGesture()
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
    if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) onManualNavigation()
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) onManualNavigation()
  }

  alignSelectedSlide()
  const resizeObserver = new ResizeObserver(() => {
    const nextWidth = carousel.clientWidth
    if (!nextWidth || nextWidth === width) return
    width = nextWidth
    alignSelectedSlide()
  })
  resizeObserver.observe(carousel)
  carousel.addEventListener('scroll', handleScroll, { passive: true })
  carousel.addEventListener('scrollend', handleScrollEnd)
  carousel.addEventListener('touchstart', handleTouchStart, { passive: false })
  carousel.addEventListener('touchmove', handleTouchMove, { passive: false })
  carousel.addEventListener('touchend', finishGesture, { passive: true })
  carousel.addEventListener('touchcancel', finishGesture, { passive: true })
  carousel.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerEnd)
  window.addEventListener('pointercancel', handlePointerEnd)
  carousel.addEventListener('lostpointercapture', handlePointerEnd)
  carousel.addEventListener('click', handleClick, true)
  carousel.addEventListener('dragstart', handleDragStart)
  carousel.addEventListener('wheel', handleWheel, { passive: true })
  carousel.addEventListener('keydown', handleKeyDown)

  return () => {
    clearTimeout(settleTimeout)
    if (gesture) carousel.style.scrollSnapType = gesture.snapType
    resizeObserver.disconnect()
    carousel.removeEventListener('scroll', handleScroll)
    carousel.removeEventListener('scrollend', handleScrollEnd)
    carousel.removeEventListener('touchstart', handleTouchStart)
    carousel.removeEventListener('touchmove', handleTouchMove)
    carousel.removeEventListener('touchend', finishGesture)
    carousel.removeEventListener('touchcancel', finishGesture)
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
  }
}

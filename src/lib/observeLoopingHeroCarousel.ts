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
  let touching = false
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
    if (touching || !offset || !width) return
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
  const handleTouchStart = (event: TouchEvent) => {
    clearTimeout(settleTimeout)
    touching = true
    if (event.touches.length !== 1 || !width) return
    const left = carousel.scrollLeft
    gesture = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      lastX: event.touches[0].clientX,
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
  const handleTouchMove = (event: TouchEvent) => {
    if (!gesture || event.touches.length !== 1) return
    const x = event.touches[0].clientX
    const deltaX = gesture.x - x
    const deltaY = gesture.y - event.touches[0].clientY
    if (!gesture.axis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      if (gesture.axis === 'x') onManualNavigation()
      else carousel.style.scrollSnapType = gesture.snapType
    }
    if (gesture.axis !== 'x') return
    event.preventDefault()
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
  }
  const handleTouchEnd = () => {
    touching = false
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
  carousel.addEventListener('touchend', handleTouchEnd, { passive: true })
  carousel.addEventListener('touchcancel', handleTouchEnd, { passive: true })
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
    carousel.removeEventListener('touchend', handleTouchEnd)
    carousel.removeEventListener('touchcancel', handleTouchEnd)
    carousel.removeEventListener('wheel', handleWheel)
    carousel.removeEventListener('keydown', handleKeyDown)
  }
}

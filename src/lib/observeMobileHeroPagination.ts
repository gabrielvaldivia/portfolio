import { animate } from 'motion/react'

/** Keep native entry snapping, with a short, cancellable exit to the next section. */
export function observeMobileHeroPagination(region: HTMLElement) {
  const root = document.documentElement
  const followUp = document.querySelector<HTMLElement>('.hero-followup-snap-point, .hero-approach-snap-point')
  if (!followUp) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let followUpSnapY = 0
  let heroSnapY = 0
  let viewportWidth = window.innerWidth
  let freeScrollReleased = false
  let exitAnimation: { stop: () => void } | null = null
  let settleTimeout: ReturnType<typeof setTimeout> | undefined
  let gesture: {
    startX: number
    startY: number
    lastY: number
    startScrollY: number
    axis: 'x' | 'y' | null
    canExit: boolean
    ownsExit: boolean
    startedInFollowUp: boolean
    interrupted: boolean
  } | null = null

  const measureBoundary = () => {
    const margin = Number.parseFloat(getComputedStyle(followUp).scrollMarginTop) || 0
    followUpSnapY = followUp.getBoundingClientRect().top + window.scrollY - margin
    heroSnapY = region.getBoundingClientRect().top + window.scrollY
  }
  const setFreeScroll = (free: boolean) => {
    root.classList.toggle('hero-project-pagination-free', free)
  }
  const stopExit = () => {
    if (!exitAnimation && !gesture?.ownsExit) return false
    exitAnimation?.stop()
    exitAnimation = null
    if (gesture) gesture.ownsExit = false
    region.removeAttribute('data-hero-exit-active')
    freeScrollReleased = true
    setFreeScroll(true)
    return true
  }
  const finishExit = (target: number) => {
    exitAnimation = null
    region.removeAttribute('data-hero-exit-active')
    freeScrollReleased = target === followUpSnapY
    setFreeScroll(freeScrollReleased)
  }
  const settleExit = () => {
    const from = window.scrollY
    const target = from - heroSnapY >= 48 ? followUpSnapY : heroSnapY
    setFreeScroll(true)
    if (reducedMotion.matches || Math.abs(target - from) < 1) {
      window.scrollTo({ top: target, behavior: 'instant' })
      finishExit(target)
      return
    }
    // Native momentum is suppressed only for this exit gesture, so it cannot
    // add a second easing phase or a final CSS snap after this animation.
    exitAnimation = animate(from, target, {
      duration: 0.24,
      ease: 'easeOut',
      onUpdate: top => window.scrollTo({ top, behavior: 'instant' }),
      onComplete: () => finishExit(target),
    })
  }
  const updateGestureMode = (deltaY: number, startedInFollowUp = false) => {
    if (!deltaY || exitAnimation || gesture?.ownsExit) return
    if (deltaY < 0) freeScrollReleased = false
    else if (startedInFollowUp) freeScrollReleased = true
    const distancePastFollowUp = window.scrollY - followUpSnapY
    // A reverse swipe must keep control until release. Restoring CSS snap
    // mid-gesture can restart the cancelled trip to FollowUp under the finger.
    setFreeScroll(Boolean(gesture?.interrupted) || freeScrollReleased || distancePastFollowUp > 1 || (deltaY > 0 && distancePastFollowUp >= -1))
  }
  const handleScrollEnd = () => {
    if (exitAnimation || gesture?.ownsExit || gesture?.interrupted) return
    measureBoundary()
    setFreeScroll(freeScrollReleased || window.scrollY > followUpSnapY + 1)
  }
  const handleTouchStart = (event: TouchEvent) => {
    const interrupted = stopExit()
    measureBoundary()
    freeScrollReleased = interrupted
    gesture = event.touches.length === 1 ? {
      startX: event.touches[0].clientX,
      startY: event.touches[0].clientY,
      lastY: event.touches[0].clientY,
      startScrollY: window.scrollY,
      axis: null,
      canExit: !interrupted && Math.abs(window.scrollY - heroSnapY) <= 2
        && event.target instanceof Node && region.contains(event.target),
      ownsExit: false,
      startedInFollowUp: event.target instanceof Node && followUp.contains(event.target),
      interrupted,
    } : null
  }
  const handleTouchMove = (event: TouchEvent) => {
    if (!gesture || event.touches.length !== 1) return
    const nextX = event.touches[0].clientX
    const nextY = event.touches[0].clientY
    const deltaX = gesture.startX - nextX
    const deltaY = gesture.startY - nextY
    if (!gesture.axis) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      if (gesture.axis === 'y' && deltaY > 0 && gesture.canExit && event.cancelable) {
        gesture.ownsExit = true
        setFreeScroll(true)
        // Keep browser-toolbar changes from moving the destination mid-exit.
        region.setAttribute('data-hero-exit-active', '')
      }
    }
    if (gesture.ownsExit) {
      event.preventDefault()
      window.scrollTo({
        top: Math.max(heroSnapY, Math.min(followUpSnapY, gesture.startScrollY + deltaY)),
        behavior: 'instant',
      })
    } else if (gesture.axis === 'y') {
      updateGestureMode(gesture.lastY - nextY, gesture.startedInFollowUp)
    }
    gesture.lastY = nextY
  }
  const handleTouchEnd = () => {
    const ownedExit = gesture?.ownsExit
    const interrupted = gesture?.interrupted
    gesture = null
    if (ownedExit) settleExit()
    else if (interrupted) handleScrollEnd()
  }
  const handlePageTouchMove = (event: TouchEvent) => {
    // Gestures that start in the hero are handled by its cancellable listener.
    if (event.target instanceof Node && region.contains(event.target)) return
    handleTouchMove(event)
  }
  const handleTouchCancel = () => {
    stopExit()
    gesture = null
  }
  const handleWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return
    stopExit()
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    measureBoundary()
    updateGestureMode(event.deltaY)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopExit()
  }
  const supportsScrollEnd = 'onscrollend' in window
  const handleResize = () => {
    if (window.innerWidth !== viewportWidth) {
      stopExit()
      gesture = null
      viewportWidth = window.innerWidth
    }
    measureBoundary()
  }
  const handleScroll = () => {
    if (exitAnimation || gesture?.ownsExit || gesture?.interrupted) return
    if (window.scrollY <= heroSnapY + 1) freeScrollReleased = false
    if (!freeScrollReleased && window.scrollY < followUpSnapY - 1) setFreeScroll(false)
    if (!supportsScrollEnd) {
      clearTimeout(settleTimeout)
      settleTimeout = setTimeout(handleScrollEnd, 180)
    }
  }

  root.classList.add('hero-project-pagination-active')
  handleScrollEnd()
  window.addEventListener('scrollend', handleScrollEnd)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  // This listener owns only a downward exit from the fully snapped hero.
  // Horizontal slides, entry, and normal page scrolling remain native.
  region.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchmove', handlePageTouchMove, { passive: true })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
  window.addEventListener('touchcancel', handleTouchCancel, { passive: true })
  window.addEventListener('wheel', handleWheel, { passive: true })
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize, { passive: true })

  return () => {
    stopExit()
    clearTimeout(settleTimeout)
    window.removeEventListener('scrollend', handleScrollEnd)
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('touchstart', handleTouchStart)
    region.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchmove', handlePageTouchMove)
    window.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('touchcancel', handleTouchCancel)
    window.removeEventListener('wheel', handleWheel)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('resize', handleResize)
    region.removeAttribute('data-hero-exit-active')
    root.classList.remove('hero-project-pagination-active', 'hero-project-pagination-free')
  }
}

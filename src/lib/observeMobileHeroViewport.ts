/** Resize the horizontal carousel while visible; freeze it below the fold. */
export function observeMobileHeroViewport(
  region: HTMLElement,
  probe: HTMLElement,
  onVisibilityChange?: (visible: boolean) => void,
) {
  const viewport = window.visualViewport
  let measuredWidth = 0
  let frame: number | null = null
  let viewportHeight = 0
  let regionTop = 0
  let regionBottom = 0
  let wasVisible = false
  let reportedVisibility: boolean | undefined

  const isVisible = (scrollY: number) => regionBottom > scrollY + 1 && regionTop < scrollY + viewportHeight - 1
  const updateVisibility = (scrollY: number) => {
    const visible = isVisible(scrollY)
    if (visible === reportedVisibility) return
    reportedVisibility = visible
    onVisibilityChange?.(visible)
  }
  const measureHeight = () => {
    frame = null
    const width = document.documentElement.clientWidth
    // Browser chrome can update the visual viewport before dvh settles.
    // Pinch zoom uses the layout viewport so it cannot shrink the carousel.
    const height = viewport && Math.abs(viewport.scale - 1) < 0.01
      ? viewport.height
      : probe.getBoundingClientRect().height
    if (height <= 0) return
    viewportHeight = height
    const scrollY = window.scrollY
    // Measure the untransformed section, outside the expanding visual surface.
    const bounds = region.getBoundingClientRect()
    regionTop = bounds.top + scrollY
    regionBottom = bounds.bottom + scrollY
    wasVisible = isVisible(scrollY)
    updateVisibility(scrollY)

    region.style.setProperty('--hero-mobile-viewport-height', `${height}px`)
    // Horizontal slides share one height. Once below the carousel, freeze it
    // so toolbar changes cannot move Approach, Work, or the scroll position.
    if (width !== measuredWidth || (wasVisible && !region.hasAttribute('data-hero-exit-active') && Math.abs(bounds.height - height) >= 0.5)) {
      region.style.setProperty('--hero-mobile-height', `${height}px`)
    }
    measuredWidth = width
  }
  const scheduleMeasurement = () => {
    if (frame === null) frame = requestAnimationFrame(measureHeight)
  }
  const handleScroll = () => {
    const scrollY = window.scrollY
    updateVisibility(scrollY)
    // Compare cached boundaries on scroll; only remeasure when entering or leaving.
    if (isVisible(scrollY) !== wasVisible) scheduleMeasurement()
  }

  measureHeight()
  const resizeObserver = new ResizeObserver(scheduleMeasurement)
  resizeObserver.observe(probe)
  resizeObserver.observe(region)
  const visibilityObserver = new IntersectionObserver(scheduleMeasurement, { threshold: [0, 0.01] })
  visibilityObserver.observe(region)
  window.addEventListener('resize', scheduleMeasurement)
  window.addEventListener('scroll', handleScroll, { passive: true })
  viewport?.addEventListener('resize', scheduleMeasurement)

  return () => {
    window.removeEventListener('resize', scheduleMeasurement)
    window.removeEventListener('scroll', handleScroll)
    viewport?.removeEventListener('resize', scheduleMeasurement)
    resizeObserver.disconnect()
    visibilityObserver.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
    region.style.removeProperty('--hero-mobile-height')
    region.style.removeProperty('--hero-mobile-viewport-height')
  }
}

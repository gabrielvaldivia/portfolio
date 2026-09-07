/** Keep the incoming hero page in sync without resizing pages behind it. */
export function observeMobileHeroViewport(
  region: HTMLElement,
  probe: HTMLElement,
  onPaginationVisibilityChange?: (visible: boolean) => void,
) {
  const slides = [...region.querySelectorAll<HTMLElement>('.hero-mobile-slide')]
  const viewport = window.visualViewport
  let measuredWidth = 0
  let lastScrollY = window.scrollY
  let scrollDirection = 1
  let frame: number | null = null
  let viewportHeight = 0
  let preparedSlide: HTMLElement | undefined
  let positions: { slide: HTMLElement; top: number; bottom: number }[] = []
  let paginationVisible: boolean | undefined

  const updatePaginationVisibility = (scrollY: number) => {
    const first = positions[0]
    const last = positions.at(-1)
    const visible = Boolean(first && last && scrollY >= first.top - 1 && scrollY <= last.top + 1)
    if (visible === paginationVisible) return
    paginationVisible = visible
    onPaginationVisibilityChange?.(visible)
  }

  const incomingAt = (scrollY: number) => {
    const visible = positions.filter(({ top, bottom }) => bottom > scrollY + 1 && top < scrollY + viewportHeight - 1)
    const snapped = visible.find(({ top }) => Math.abs(top - scrollY) <= 1)
    return snapped ?? (scrollDirection > 0 ? visible.at(-1) : visible[0])
  }

  const measureHeight = () => {
    frame = null
    const width = document.documentElement.clientWidth
    // dvh can lag behind the browser toolbar's animation. Use the live
    // visual viewport for layout AND caption insets. Fall back to dvh when
    // unavailable or zoomed: pinch zoom should not change the page heights.
    const height = viewport && Math.abs(viewport.scale - 1) < 0.01
      ? viewport.height
      : probe.getBoundingClientRect().height
    if (height <= 0) return
    viewportHeight = height
    const scrollY = window.scrollY
    positions = slides.map(slide => {
      const { top, bottom } = slide.getBoundingClientRect()
      return { slide, top: top + scrollY, bottom: bottom + scrollY }
    })
    const incoming = incomingAt(scrollY)
    preparedSlide = incoming?.slide
    updatePaginationVisibility(scrollY)

    // Batch every layout read above the writes, once per viewport/visibility
    // event. No height transition or competing JS pagination animation.
    region.style.setProperty('--hero-mobile-viewport-height', `${height}px`)
    if (width !== measuredWidth) {
      measuredWidth = width
      region.style.setProperty('--hero-mobile-height', `${height}px`)
      slides.forEach(slide => slide.style.removeProperty('--hero-mobile-height'))
      return
    }

    // Prepare the incoming page on entry, not when it fills half the viewport.
    // Leave the outgoing page alone so its height can't move the destination
    // during native snapping. Once outside the slideshow, all pages freeze.
    if (incoming && Math.abs(incoming.bottom - incoming.top - height) >= 0.5) {
      incoming.slide.style.setProperty('--hero-mobile-height', `${height}px`)
    }
  }
  const scheduleMeasurement = () => {
    if (frame === null) frame = requestAnimationFrame(measureHeight)
  }
  const trackDirection = () => {
    const delta = window.scrollY - lastScrollY
    if (Math.abs(delta) > 1) scrollDirection = Math.sign(delta)
    lastScrollY = window.scrollY
    // Show controls only from the first full-screen page through the last.
    // This is a boundary toggle, not a scroll-driven animation or layout read.
    updatePaginationVisibility(lastScrollY)
    // WebKit can defer intersection notifications during smooth pagination.
    // Compare cached boundaries, scheduling only once on entry to a new page;
    // don't wait for that late observer callback or measure on every scroll.
    if (incomingAt(lastScrollY)?.slide !== preparedSlide) scheduleMeasurement()
  }

  measureHeight()
  const viewportObserver = new ResizeObserver(scheduleMeasurement)
  viewportObserver.observe(probe)
  viewportObserver.observe(region)
  // Ignore a merely touching edge, but update well before the incoming page
  // reaches the middle. Scroll handling only compares cached page boundaries.
  const visibilityObserver = new IntersectionObserver(scheduleMeasurement, { threshold: [0, 0.01] })
  slides.forEach(slide => visibilityObserver.observe(slide))
  window.addEventListener('resize', scheduleMeasurement)
  window.addEventListener('scroll', trackDirection, { passive: true })
  viewport?.addEventListener('resize', scheduleMeasurement)

  return () => {
    window.removeEventListener('resize', scheduleMeasurement)
    window.removeEventListener('scroll', trackDirection)
    viewport?.removeEventListener('resize', scheduleMeasurement)
    viewportObserver.disconnect()
    visibilityObserver.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
    region.style.removeProperty('--hero-mobile-height')
    region.style.removeProperty('--hero-mobile-viewport-height')
    slides.forEach(slide => slide.style.removeProperty('--hero-mobile-height'))
  }
}

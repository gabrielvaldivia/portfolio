/**
 * Turn full-width slides like the faces of a cube, as Instagram stories do.
 *
 * Neighbouring slides hinge on their shared edge, which stays in the screen
 * plane and moves with the scroll position. Their faces stay at right angles,
 * so together they read as a rotating cube. Scrolling sometimes reaches the
 * screen a frame before these styles do; because the hinge itself scrolls
 * natively, that lag only changes the angle, never where a slide sits.
 */
export function observeHeroCubeTransition(carousel: HTMLElement, count: number) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = carousel.clientWidth

  const flatten = (slide: HTMLElement, visible: boolean) => {
    slide.style.removeProperty('transform')
    slide.style.removeProperty('transform-origin')
    slide.style.removeProperty('backface-visibility')
    slide.style.removeProperty('-webkit-backface-visibility')
    slide.style.removeProperty('--hero-cube-shade')
    if (visible) slide.style.removeProperty('visibility')
    else slide.style.visibility = 'hidden'
  }

  const update = () => {
    const slides = carousel.children
    if (reducedMotion.matches || !width) {
      for (const slide of slides) flatten(slide as HTMLElement, true)
      return
    }

    const position = carousel.scrollLeft / width
    // Looping adds a copy of the last slide before the first and of the first after the last.
    const looping = count > 1 && slides.length === count + 2
    // A shallower perspective exaggerates the turn; this matches its depth on phones.
    const perspective = width * 2.2
    for (let index = 0; index < slides.length; index++) {
      const slide = slides[index] as HTMLElement
      // -1 is one slide to the left of the viewport, 1 one slide to the right.
      let offset = index - position
      // Near the loop seam, style each copy like its twin at the other end. The
      // loop can jump between them after this frame's styles are set; matching
      // styles mean that jump never shows a hidden slide.
      if (looping && index <= 1 && position >= count) offset += count
      else if (looping && index >= count && position <= 1) offset -= count
      const distance = Math.abs(offset)
      if (distance < 0.001 || distance >= 1) {
        // Settled slides stay untransformed; the rest are behind the cube.
        flatten(slide, distance < 1)
        continue
      }

      const angle = offset * 90
      // Look from the middle of the viewport, expressed in this slide's own coordinates.
      const origin = width / 2 - offset * width
      // The incoming face hinges on its left edge, the outgoing one on its right.
      const hinge = (offset > 0 ? 0 : width) - origin
      slide.style.visibility = ''
      slide.style.transformOrigin = `${origin}px 50%`
      slide.style.transform = `perspective(${perspective}px) translateX(${hinge}px) rotateY(${angle}deg) translateX(${-hinge}px)`
      // Hide a face once it turns away from the viewer, as on a real cube.
      slide.style.setProperty('backface-visibility', 'hidden')
      slide.style.setProperty('-webkit-backface-visibility', 'hidden')
      // Faces darken as they turn away from the light.
      slide.style.setProperty('--hero-cube-shade', ((1 - Math.cos(angle * Math.PI / 180)) * 0.7).toFixed(3))
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    width = carousel.clientWidth
    update()
  })

  update()
  resizeObserver.observe(carousel)
  // Update inside the scroll event so programmatic jumps, such as the loop
  // rebasing onto a real slide, paint with matching transforms.
  carousel.addEventListener('scroll', update, { passive: true })
  reducedMotion.addEventListener('change', update)

  return () => {
    resizeObserver.disconnect()
    carousel.removeEventListener('scroll', update)
    reducedMotion.removeEventListener('change', update)
    for (const slide of carousel.children) flatten(slide as HTMLElement, true)
  }
}

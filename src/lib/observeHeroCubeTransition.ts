/**
 * Turn full-width slides like the faces of a cube, as Instagram stories do.
 *
 * Neighbouring slides hinge on their shared edge, which stays in the screen
 * plane and moves with the scroll position. Their faces stay at right angles,
 * so together they read as a rotating cube. Scrolling sometimes reaches the
 * screen a frame before these styles do; because the hinge itself scrolls
 * natively, that lag only changes the angle, never where a slide sits.
 *
 * Each slide stays untransformed, so its box always matches its scroll
 * position; only the slide's `.hero-mobile-face` child turns, and its
 * `.hero-mobile-shade` darkens. Faces near the viewport keep their
 * compositing layers between turns, so a turn only changes transforms and
 * opacity, never layout or paint. Call `update` right after moving the
 * carousel in an animation frame, so faces turn in that same frame.
 */
export function observeHeroCubeTransition(carousel: HTMLElement, count: number) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = carousel.clientWidth
  // The last styles written to each face, to skip writes that change nothing.
  const applied = new WeakMap<HTMLElement, string>()

  const partsOf = (slide: Element) => {
    const face = slide.firstElementChild
    if (!(face instanceof HTMLElement) || !face.classList.contains('hero-mobile-face')) return null
    const shade = face.lastElementChild
    return { face, shade: shade instanceof HTMLElement && shade.classList.contains('hero-mobile-shade') ? shade : null }
  }

  const write = (
    { face, shade }: { face: HTMLElement; shade: HTMLElement | null },
    key: string,
    layer: boolean,
    transform = '',
    origin = '',
    darkness = '',
  ) => {
    if (applied.get(face) === key) return
    applied.set(face, key)
    face.style.willChange = layer ? 'transform' : ''
    face.style.transform = transform
    face.style.transformOrigin = origin
    if (!shade) return
    shade.style.willChange = layer ? 'opacity' : ''
    shade.style.opacity = darkness
  }

  const update = () => {
    const slides = carousel.children
    const enabled = !reducedMotion.matches && width > 0
    const position = enabled ? carousel.scrollLeft / width : 0
    // Looping adds a copy of the last slide before the first and of the first after the last.
    const looping = count > 1 && slides.length === count + 2
    // A shallower perspective exaggerates the turn; this matches its depth on phones.
    const perspective = Math.round(width * 2.2)

    for (let index = 0; index < slides.length; index++) {
      const parts = partsOf(slides[index])
      if (!parts) continue
      if (!enabled) {
        write(parts, 'off', false)
        continue
      }

      // -1 is one slide to the left of the viewport, 1 one slide to the right.
      let offset = index - position
      // Between the copies at each end, style each copy like its twin. The loop
      // can jump between them before these styles update; matching styles
      // mean that jump never shows a flat slide in the middle of a turn.
      if (looping && index <= 1 && position > count) offset += count
      else if (looping && index >= count && position < 1) offset -= count
      const distance = Math.abs(offset)

      if (distance > 1.0005) {
        write(parts, 'far', false)
        continue
      }
      if (distance < 0.0005 || distance > 0.9995) {
        // Settled or about to turn in: flat, with its layer kept ready.
        write(parts, 'ready', true)
        continue
      }

      const angle = Math.round(offset * 9000) / 100
      // Look from the middle of the viewport, expressed in this face's own coordinates.
      const origin = Math.round((width / 2 - offset * width) * 10) / 10
      // The incoming face hinges on its left edge, the outgoing one on its right.
      const hinge = Math.round(((offset > 0 ? 0 : width) - origin) * 10) / 10
      const transform = `perspective(${perspective}px) translateX(${hinge}px) rotateY(${angle}deg) translateX(${-hinge}px)`
      // Faces darken as they turn away from the light.
      const darkness = ((1 - Math.cos(angle * Math.PI / 180)) * 0.7).toFixed(3)
      write(parts, transform, true, transform, `${origin}px 50%`, darkness)
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

  return {
    update,
    stop() {
      resizeObserver.disconnect()
      carousel.removeEventListener('scroll', update)
      reducedMotion.removeEventListener('change', update)
      for (const slide of carousel.children) {
        const parts = partsOf(slide)
        if (parts) {
          applied.delete(parts.face)
          write(parts, 'off', false)
        }
      }
    },
  }
}

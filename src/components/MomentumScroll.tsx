'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

export function MomentumScroll({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const velocity = useRef(0)
  const isDragging = useRef(false)
  const lastX = useRef(0)
  const lastTime = useRef(0)
  const animFrame = useRef<number>(0)
  const [fadeLeft, setFadeLeft] = useState(0)
  const [fadeRight, setFadeRight] = useState(0)

  const updateMask = useCallback(() => {
    const el = ref.current
    if (!el) return
    const hasOverflow = el.scrollWidth > el.clientWidth
    if (!hasOverflow) { setFadeLeft(0); setFadeRight(0); return }
    const scrollLeft = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    // Fade in over first/last 50px of scroll
    setFadeLeft(Math.min(scrollLeft / 50, 1))
    setFadeRight(Math.min((maxScroll - scrollLeft) / 50, 1))
  }, [])

  const animate = useCallback(() => {
    const el = ref.current
    if (!el || isDragging.current) return

    velocity.current *= 0.95 // friction
    if (Math.abs(velocity.current) < 0.5) {
      velocity.current = 0
      return
    }

    el.scrollLeft -= velocity.current
    updateMask()
    animFrame.current = requestAnimationFrame(animate)
  }, [updateMask])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    updateMask()

    let didDrag = false

    const onDragStart = (e: Event) => {
      e.preventDefault()
    }

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true
      didDrag = false
      velocity.current = 0
      lastX.current = e.clientX
      lastTime.current = Date.now()
      cancelAnimationFrame(animFrame.current)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastX.current
      if (Math.abs(dx) > 5) {
        didDrag = true
        el.style.cursor = 'grabbing'
      }
      const now = Date.now()
      const dt = now - lastTime.current || 1
      velocity.current = dx / dt * 16
      el.scrollLeft -= dx
      lastX.current = e.clientX
      lastTime.current = now
      updateMask()
    }

    const onPointerUp = () => {
      isDragging.current = false
      el.style.cursor = ''
      animFrame.current = requestAnimationFrame(animate)
    }

    const onClick = (e: MouseEvent) => {
      if (didDrag) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        el.scrollLeft += e.deltaX
        updateMask()
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('click', onClick, { capture: true })
    el.addEventListener('dragstart', onDragStart)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', updateMask, { passive: true })

    // Prevent native drag on all links/images inside
    el.querySelectorAll('a, img').forEach(child => {
      child.setAttribute('draggable', 'false')
    })

    const observer = new ResizeObserver(updateMask)
    observer.observe(el)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('click', onClick, { capture: true } as any)
      el.removeEventListener('dragstart', onDragStart)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', updateMask)
      observer.disconnect()
      cancelAnimationFrame(animFrame.current)
    }
  }, [animate, updateMask])

  return (
    <div className={`${className} relative`}>
      <div
        ref={ref}
        className="overflow-x-auto scrollbar-hide cursor-grab select-none"
        style={{ scrollbarWidth: 'none', touchAction: 'pan-y' }}
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden tablet:block tablet:w-[40px] desktop:w-[80px]"
        style={{
          opacity: fadeLeft,
          transition: 'opacity 0.3s ease',
          background: 'linear-gradient(to right, var(--color-background), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden tablet:block tablet:w-[40px] desktop:w-[80px]"
        style={{
          opacity: fadeRight,
          transition: 'opacity 0.3s ease',
          background: 'linear-gradient(to left, var(--color-background), transparent)',
        }}
      />
    </div>
  )
}

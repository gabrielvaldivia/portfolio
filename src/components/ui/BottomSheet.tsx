'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { getSheetDestination } from '@/lib/bottomSheet'

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  title: string
  headerAction?: ReactNode
  children: ReactNode
  onAfterClose?: () => void
  onCloseAutoFocus?: (event: Event) => void
}

type Gesture = {
  x: number; y: number; lastY: number; lastTime: number; velocity: number; origin: number
  handle: boolean; mode: 'pending' | 'drag' | 'scroll'
}

function SheetSurface({ title, headerAction, children, onOpenChange, onCloseAutoFocus }: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const heightRef = useRef(0)
  const gestureRef = useRef<Gesture | null>(null)
  const suppressClickRef = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const y = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const animationRef = useRef<ReturnType<typeof animate> | null>(null)
  const latest = useRef({ expanded, onOpenChange, reduceMotion })
  latest.current = { expanded, onOpenChange, reduceMotion }

  function settle(full: boolean) {
    animationRef.current?.stop()
    animationRef.current = animate(y, full ? 0 : heightRef.current * 0.38,
      latest.current.reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 30, mass: 0.85 })
  }

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    heightRef.current = content.clientHeight
    y.set(heightRef.current)
    settle(false)
    // Measure only when the viewport changes, never on animation frames.
    const observer = new ResizeObserver(() => {
      if (heightRef.current === content.clientHeight) return
      heightRef.current = content.clientHeight
      gestureRef.current = null
      settle(latest.current.expanded)
    })
    observer.observe(content)

    function begin(x: number, pointY: number, target: EventTarget | null) {
      suppressClickRef.current = false
      if (!(target instanceof Element) || target.closest('[data-sheet-no-drag]')) return
      gestureRef.current = { x, y: pointY, lastY: pointY, lastTime: performance.now(), velocity: 0, origin: y.get(),
        handle: Boolean(target.closest('[data-sheet-handle]')), mode: 'pending' }
    }
    function move(x: number, pointY: number, event: Event) {
      const gesture = gestureRef.current
      if (!gesture || gesture.mode === 'scroll') return
      const distance = pointY - gesture.y
      if (gesture.mode === 'pending') {
        if (Math.max(Math.abs(distance), Math.abs(x - gesture.x)) < 6) return
        // Once native scrolling owns a gesture, never steal it mid-scroll.
        if (Math.abs(x - gesture.x) > Math.abs(distance) || (!gesture.handle &&
          ((scrollRef.current?.scrollTop || 0) > 0 || (latest.current.expanded && distance < 0)))) {
          gesture.mode = 'scroll'
          return
        }
        gesture.mode = 'drag'
        suppressClickRef.current = true
        animationRef.current?.stop()
        gesture.origin = y.get()
      }
      if (event.cancelable) event.preventDefault()
      const now = performance.now()
      const elapsed = now - gesture.lastTime
      if (elapsed > 0) gesture.velocity = (pointY - gesture.lastY) / elapsed * 1000
      gesture.lastY = pointY
      gesture.lastTime = now
      y.set(Math.max(0, gesture.origin + distance))
    }
    function end(cancelled = false) {
      const gesture = gestureRef.current
      gestureRef.current = null
      if (!gesture || gesture.mode !== 'drag') return
      const velocity = performance.now() - gesture.lastTime < 100 ? gesture.velocity : 0
      const destination = cancelled ? (latest.current.expanded ? 'full' : 'partial')
        : getSheetDestination(latest.current.expanded, gesture.lastY - gesture.y, velocity)
      if (destination === 'closed') latest.current.onOpenChange(false)
      else {
        const full = destination === 'full'
        latest.current.expanded = full
        setExpanded(full)
        settle(full)
      }
    }
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) { end(true); return }
      begin(event.touches[0].clientX, event.touches[0].clientY, event.target)
    }
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) { end(true); return }
      move(event.touches[0].clientX, event.touches[0].clientY, event)
    }
    const touchEnd = () => end()
    const touchCancel = () => end(true)
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button === 0) begin(event.clientX, event.clientY, event.target)
    }
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') move(event.clientX, event.clientY, event)
    }
    const pointerUp = (event: PointerEvent) => { if (event.pointerType === 'mouse') end() }
    content.addEventListener('touchstart', touchStart, { passive: true })
    // Only sheet drags cancel native scrolling. The list keeps native momentum.
    content.addEventListener('touchmove', touchMove, { passive: false })
    content.addEventListener('touchend', touchEnd)
    content.addEventListener('touchcancel', touchCancel)
    content.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)
    return () => {
      observer.disconnect()
      animationRef.current?.stop()
      content.removeEventListener('touchstart', touchStart)
      content.removeEventListener('touchmove', touchMove)
      content.removeEventListener('touchend', touchEnd)
      content.removeEventListener('touchcancel', touchCancel)
      content.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
    }
  }, [y])

  return (
    <Dialog.Content forceMount asChild aria-describedby={undefined}
      onOpenAutoFocus={(event) => { event.preventDefault(); contentRef.current?.focus({ preventScroll: true }) }}
      onCloseAutoFocus={onCloseAutoFocus}>
      <motion.div ref={contentRef} data-bottom-sheet data-expanded={expanded}
        className="fixed inset-x-0 bottom-0 top-[env(safe-area-inset-top)] z-70 overflow-hidden rounded-t-3xl bg-elevated text-content shadow-lg outline-none"
        style={{ y }} exit={{ y: '100%' }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
        onClickCapture={(event) => {
          if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation(); suppressClickRef.current = false }
        }}>
        {/* Resize the scroll viewport once per snap, not continuously during motion. */}
        <div className="flex flex-col" style={{ height: expanded ? '100%' : '62%' }}>
          <div data-sheet-handle className="shrink-0 touch-none">
            <button type="button" aria-label={expanded ? 'Collapse highlights' : 'Expand highlights to full screen'}
              aria-expanded={expanded} className="flex h-11 w-full items-start justify-center pt-2.5 outline-none"
              onClick={() => { setExpanded(!expanded); settle(!expanded) }}>
              <span aria-hidden="true" className="h-1 w-9 rounded-full bg-border-strong" />
            </button>
            <div className="flex items-center justify-between gap-4 px-5 pb-2">
              <Dialog.Title asChild><h3>{title}</h3></Dialog.Title>
              <div data-sheet-no-drag>{headerAction}</div>
            </div>
          </div>
          <div ref={scrollRef} data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
          <Dialog.Close className="sr-only">Close highlights</Dialog.Close>
        </div>
      </motion.div>
    </Dialog.Content>
  )
}

export function BottomSheet(props: BottomSheetProps) {
  const reduceMotion = useReducedMotion()
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Trigger asChild>{props.trigger}</Dialog.Trigger>
      <Dialog.Portal forceMount>
        <AnimatePresence onExitComplete={props.onAfterClose}>
          {props.open ? (
            <Dialog.Overlay forceMount asChild key="backdrop">
              <motion.div className="fixed inset-0 z-70 bg-black/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} />
            </Dialog.Overlay>
          ) : null}
          {props.open ? <SheetSurface key="sheet" {...props} /> : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

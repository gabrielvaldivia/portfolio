'use client'

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from 'motion/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { mediaBlockComponents, phoneFrameBlockTypes } from '@/blocks/MediaBlockComponents'
import { ModuleLikeButton } from '@/components/ModuleLikeButton'
import { cn } from '@/lib/cn'
import type { LightboxRect, ModuleLightboxOverlayProps, ModuleLightboxSlide } from '@/components/ModuleLightbox'

type DragState = {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastTime: number
  velocityX: number
  velocityY: number
  captured: boolean
}

type TransitionMode = 'zoom' | 'swipe' | 'dismiss'

const ZOOM_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.85,
}

const FADE_TRANSITION: Transition = {
  duration: 0.18,
  ease: [0.2, 0, 0, 1],
}

const SWIPE_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 42,
  mass: 0.9,
}

const ZOOM_DURATION_MS = 560

const ZOOM_ENTRY_TIMING: KeyframeAnimationOptions = {
  duration: ZOOM_DURATION_MS,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'both',
}

const ZOOM_EXIT_TRANSITION: Transition = {
  duration: ZOOM_DURATION_MS / 1000,
  ease: [0.22, 1, 0.36, 1],
}

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total
}

function rubberBandDismissOffset(offset: number) {
  if (offset <= 0) return 0
  if (offset <= 260) return offset

  return 260 + (offset - 260) * 0.35
}

function getElementRect(element: HTMLElement | null): LightboxRect | undefined {
  const rect = element?.getBoundingClientRect()
  if (!rect || rect.width <= 0 || rect.height <= 0) return undefined

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

function getFlipTransform(sourceRect: LightboxRect, targetRect: LightboxRect) {
  return {
    x: sourceRect.left - targetRect.left,
    y: sourceRect.top - targetRect.top,
    scaleX: sourceRect.width / targetRect.width,
    scaleY: sourceRect.height / targetRect.height,
  }
}

function getFlipCssTransform(sourceRect: LightboxRect, targetRect: LightboxRect) {
  const transform = getFlipTransform(sourceRect, targetRect)

  return `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scaleX}, ${transform.scaleY})`
}

function ModuleSlide({
  slide,
  active,
  sourceAspectRatio,
}: {
  slide: ModuleLightboxSlide
  active: boolean
  sourceAspectRatio?: number
}) {
  const Component = mediaBlockComponents[slide.block?.blockType]

  if (!Component) return null

  return (
    <Component
      {...slide.block}
      _active={active}
      _lightboxAspectRatio={sourceAspectRatio}
      _likeTargetId={null}
      _mode="lightbox"
    />
  )
}

function ModuleLightboxSlideView({
  slide,
  direction,
  transitionMode,
  prefersReducedMotion,
  entrySourceRect,
  exitSourceRect,
  sourceAspectRatio,
  activeSlideIsPhoneFrame,
  activeSlideUsesMeasuredAspect,
  activeSlideTransition,
  dragX,
  dragY,
  dragScale,
  handlePointerDown,
  handlePointerMove,
  handlePointerEnd,
  handleMouseDown,
}: {
  slide: ModuleLightboxSlide
  direction: number
  transitionMode: TransitionMode
  prefersReducedMotion: boolean | null
  entrySourceRect?: LightboxRect
  exitSourceRect?: LightboxRect
  sourceAspectRatio?: number
  activeSlideIsPhoneFrame: boolean
  activeSlideUsesMeasuredAspect: boolean
  activeSlideTransition: Transition
  dragX: ReturnType<typeof useMotionValue<number>>
  dragY: ReturnType<typeof useMotionValue<number>>
  dragScale: ReturnType<typeof useTransform<number, number>>
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerEnd: (event: PointerEvent<HTMLDivElement>) => void
  handleMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
}) {
  const targetRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const entryAnimationRef = useRef<Animation | null>(null)
  const [targetRect, setTargetRect] = useState<LightboxRect | null>(null)
  const [ready, setReady] = useState(transitionMode !== 'zoom' || prefersReducedMotion || !entrySourceRect)
  const activeDragStyle = transitionMode === 'swipe'
    ? {}
    : { x: dragX, y: dragY, scale: dragScale }

  useLayoutEffect(() => {
    const element = zoomRef.current
    const targetElement = targetRef.current

    entryAnimationRef.current?.cancel()
    entryAnimationRef.current = null

    if (!element || !targetElement) {
      setReady(true)
      return
    }

    const nextTargetRect = getElementRect(targetElement)
    if (!nextTargetRect) {
      setReady(true)
      return
    }

    setTargetRect(nextTargetRect)
    element.style.opacity = '1'
    element.style.transformOrigin = 'top left'

    if (transitionMode !== 'zoom' || prefersReducedMotion || !entrySourceRect) {
      element.style.transform = ''
      element.style.visibility = 'visible'
      setReady(true)
      return
    }

    const initialTransform = getFlipCssTransform(entrySourceRect, nextTargetRect)
    const finalTransform = 'translate3d(0px, 0px, 0px) scale(1, 1)'

    element.style.transform = initialTransform
    element.style.visibility = 'visible'
    setReady(true)

    if (typeof element.animate !== 'function') {
      element.style.transform = finalTransform
      return
    }

    const animation = element.animate([
      { transform: initialTransform, opacity: 1 },
      { transform: finalTransform, opacity: 1 },
    ], ZOOM_ENTRY_TIMING)

    entryAnimationRef.current = animation

    animation.onfinish = () => {
      if (entryAnimationRef.current !== animation) return
      entryAnimationRef.current = null
      element.style.transform = ''
    }

    animation.oncancel = () => {
      if (entryAnimationRef.current === animation) {
        entryAnimationRef.current = null
      }
    }

    return () => {
      if (entryAnimationRef.current === animation) {
        entryAnimationRef.current = null
      }
      animation.cancel()
    }
  }, [entrySourceRect, prefersReducedMotion, slide.id, transitionMode])

  const exitTransform = transitionMode === 'zoom' && exitSourceRect && targetRect && !prefersReducedMotion
    ? {
      ...getFlipTransform(exitSourceRect, targetRect),
      scale: 1,
      opacity: 1,
      transition: ZOOM_EXIT_TRANSITION,
    }
    : transitionMode === 'dismiss' && !prefersReducedMotion
      ? { y: 220, scale: 0.86, opacity: 0 }
      : transitionMode === 'swipe' && !prefersReducedMotion
        ? { x: direction > 0 ? '-100vw' : '100vw', opacity: 1 }
        : { opacity: 1 }

  return (
    <motion.div
      ref={targetRef}
      key={slide.id}
      className={cn(
        activeSlideIsPhoneFrame
          ? 'w-fit max-w-[calc(100dvw-32px)]'
          : activeSlideUsesMeasuredAspect
            ? 'w-[calc(100dvw-32px)] max-w-[1440px]'
            : 'w-full max-w-[min(1440px,100%)]',
      )}
      initial={
        transitionMode === 'swipe' && !prefersReducedMotion
          ? { x: direction > 0 ? '100vw' : '-100vw', opacity: 1 }
          : false
      }
      animate={
        transitionMode === 'swipe'
          ? { x: 0, opacity: 1 }
          : undefined
      }
      exit={exitTransform}
      transition={activeSlideTransition}
      style={{
        ...activeDragStyle,
        transformOrigin: 'top left',
        willChange: 'transform',
      }}
    >
      <div
        ref={zoomRef}
        style={{
          transformOrigin: 'top left',
          visibility: ready ? 'visible' : 'hidden',
          willChange: 'transform',
        }}
      >
        <motion.div
          custom={direction}
          className="cursor-grab touch-none active:cursor-grabbing"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onMouseDown={handleMouseDown}
          onDragStartCapture={(event) => event.preventDefault()}
          onClick={(event) => event.stopPropagation()}
        >
          <ModuleSlide slide={slide} active sourceAspectRatio={sourceAspectRatio} />
        </motion.div>
      </div>
    </motion.div>
  )
}

export function ModuleLightboxOverlay({
  slides,
  initialIndex,
  initialSourceRect,
  getSourceRect,
  getSourceAspectRatio,
  onClosed,
}: ModuleLightboxOverlayProps) {
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0)
  const [transitionMode, setTransitionMode] = useState<TransitionMode>('zoom')
  const [mounted, setMounted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const dragState = useRef<DragState | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [entrySourceRect, setEntrySourceRect] = useState<LightboxRect | undefined>(initialSourceRect)
  const [exitSourceRect, setExitSourceRect] = useState<LightboxRect | undefined>()
  const dragScale = useTransform(dragY, [0, 240], [1, 0.88])
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.36])
  const open = index >= 0
  const activeSlide = open ? slides[index] : null
  const lightboxMounted = open || isClosing
  const activeSlideIsPhoneFrame = activeSlide
    ? phoneFrameBlockTypes.includes(activeSlide.block?.blockType)
    : false
  const activeSlideUsesMeasuredAspect = Boolean(activeSlide?.preserveAspectDuringZoom)
  const activeSlideSourceAspectRatio = activeSlide
    ? getSourceAspectRatio(activeSlide.id)
    : undefined
  const activeSlideTransition = prefersReducedMotion
    ? FADE_TRANSITION
    : transitionMode === 'swipe'
      ? SWIPE_TRANSITION
      : ZOOM_TRANSITION

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const resetDrag = useCallback(() => {
    animate(dragX, 0, ZOOM_TRANSITION)
    animate(dragY, 0, ZOOM_TRANSITION)
  }, [dragX, dragY])

  const close = useCallback((mode: TransitionMode = 'zoom') => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    dragState.current = null

    const nextSourceRect = mode === 'zoom' && activeSlide
      ? getSourceRect(activeSlide.id)
      : undefined
    flushSync(() => {
      setExitSourceRect(nextSourceRect)
      setTransitionMode(mode)
    })

    setIsClosing(true)
    setIndex(-1)

    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      dragX.set(0)
      dragY.set(0)
      closeTimeoutRef.current = null
      setEntrySourceRect(undefined)
      setExitSourceRect(undefined)
      onClosed()
    }, prefersReducedMotion ? 220 : 560)
  }, [activeSlide, dragX, dragY, getSourceRect, onClosed, prefersReducedMotion])

  const navigate = useCallback((increment: number) => {
    if (slides.length <= 1 || index < 0) {
      resetDrag()
      return
    }

    dragX.set(0)
    dragY.set(0)
    setEntrySourceRect(undefined)
    setExitSourceRect(undefined)

    flushSync(() => {
      setDirection(increment)
      setTransitionMode('swipe')
    })

    setIndex((currentIndex) => wrapIndex(currentIndex + increment, slides.length))
  }, [dragX, dragY, index, resetDrag, slides.length])

  const completeDrag = useCallback((offsetX: number, offsetY: number, velocityX: number) => {
    const absX = Math.abs(offsetX)
    const absY = Math.abs(offsetY)
    const horizontalIntent = absX > absY

    if (offsetY > 120 && absY > absX * 0.85) {
      close('zoom')
      return
    }

    if (horizontalIntent && slides.length > 1 && (absX > 90 || Math.abs(velocityX) > 620)) {
      navigate(offsetX < 0 ? 1 : -1)
      return
    }

    resetDrag()
  }, [close, navigate, resetDrag, slides.length])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof HTMLElement && target.closest('button,a,input,textarea,select,summary')) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0,
      captured: true,
    }
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    if (!state || state.pointerId !== event.pointerId) return

    const now = performance.now()
    const offsetX = event.clientX - state.startX
    const rawOffsetY = event.clientY - state.startY
    const offsetY = Math.max(0, rawOffsetY)
    const elapsed = Math.max(1, now - state.lastTime)
    const movedEnough = Math.hypot(offsetX, rawOffsetY) > 4

    if (!movedEnough) return

    event.preventDefault()
    state.velocityX = ((event.clientX - state.lastX) / elapsed) * 1000
    state.velocityY = ((event.clientY - state.lastY) / elapsed) * 1000
    state.lastX = event.clientX
    state.lastY = event.clientY
    state.lastTime = now

    dragX.set(offsetX)
    dragY.set(rubberBandDismissOffset(offsetY))
  }, [dragX, dragY])

  const handlePointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = dragState.current
    if (!state || state.pointerId !== event.pointerId) return

    const offsetX = event.clientX - state.startX
    const offsetY = Math.max(0, event.clientY - state.startY)

    if (state.captured && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragState.current = null

    if (!state.captured) return
    completeDrag(offsetX, offsetY, state.velocityX)
  }, [completeDrag])

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (dragState.current || event.button !== 0) return

    const target = event.target
    if (target instanceof HTMLElement && target.closest('button,a,input,textarea,select,summary')) return
    if (!(target instanceof HTMLElement && target.closest('video'))) event.preventDefault()

    const state: DragState = {
      pointerId: -1,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityX: 0,
      velocityY: 0,
      captured: true,
    }

    dragState.current = state

    const handleWindowMouseMove = (mouseEvent: globalThis.MouseEvent) => {
      const currentState = dragState.current
      if (!currentState || currentState !== state) return

      const now = performance.now()
      const offsetX = mouseEvent.clientX - currentState.startX
      const rawOffsetY = mouseEvent.clientY - currentState.startY
      const offsetY = Math.max(0, rawOffsetY)
      const elapsed = Math.max(1, now - currentState.lastTime)

      if (Math.hypot(offsetX, rawOffsetY) <= 4) return

      mouseEvent.preventDefault()
      currentState.velocityX = ((mouseEvent.clientX - currentState.lastX) / elapsed) * 1000
      currentState.velocityY = ((mouseEvent.clientY - currentState.lastY) / elapsed) * 1000
      currentState.lastX = mouseEvent.clientX
      currentState.lastY = mouseEvent.clientY
      currentState.lastTime = now

      dragX.set(offsetX)
      dragY.set(rubberBandDismissOffset(offsetY))
    }

    const handleWindowMouseUp = (mouseEvent: globalThis.MouseEvent) => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)

      const currentState = dragState.current
      if (!currentState || currentState !== state) return

      dragState.current = null
      completeDrag(
        mouseEvent.clientX - currentState.startX,
        Math.max(0, mouseEvent.clientY - currentState.startY),
        currentState.velocityX,
      )
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
  }, [completeDrag, dragX, dragY])

  useEffect(() => {
    if (!lightboxMounted) return

    const originalOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        close()
      }
      if (event.key === 'ArrowLeft') navigate(-1)
      if (event.key === 'ArrowRight') navigate(1)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.documentElement.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, lightboxMounted, navigate])

  const lightbox = lightboxMounted ? (
    <div
      className={cn(
        'fixed inset-0 z-[100] overflow-hidden text-black dark:text-white',
        open ? '' : 'pointer-events-none',
      )}
      onClick={() => {
        if (open) close()
      }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={FADE_TRANSITION}
        style={{ willChange: 'opacity' }}
      >
        <motion.div className="absolute inset-0 bg-white dark:bg-black" style={{ opacity: backdropOpacity }} />
      </motion.div>

      {activeSlide && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-3 tablet:p-5">
            <button
              type="button"
              aria-label="Close lightbox"
              className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors hover:bg-hover"
              onClick={(event) => {
                event.stopPropagation()
                close()
              }}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous module"
                className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors hover:bg-hover tablet:flex"
                onClick={(event) => {
                  event.stopPropagation()
                  navigate(-1)
                }}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next module"
                className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors hover:bg-hover tablet:flex"
                onClick={(event) => {
                  event.stopPropagation()
                  navigate(1)
                }}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}

          {activeSlide.likeTargetId && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 tablet:bottom-6">
              <div className="pointer-events-auto rounded-full bg-black/10 p-1 text-black backdrop-blur-xl dark:bg-white/10 dark:text-white">
                <ModuleLikeButton targetId={activeSlide.likeTargetId} />
              </div>
            </div>
          )}
        </>
      )}

      <div className="absolute inset-0 flex items-center justify-center px-4 py-14 tablet:px-12 tablet:py-16 desktop:px-20">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          {activeSlide && (
            <ModuleLightboxSlideView
              key={activeSlide.id}
              slide={activeSlide}
              direction={direction}
              transitionMode={transitionMode}
              prefersReducedMotion={prefersReducedMotion}
              entrySourceRect={entrySourceRect}
              exitSourceRect={exitSourceRect}
              sourceAspectRatio={activeSlideSourceAspectRatio}
              activeSlideIsPhoneFrame={activeSlideIsPhoneFrame}
              activeSlideUsesMeasuredAspect={activeSlideUsesMeasuredAspect}
              activeSlideTransition={activeSlideTransition}
              dragX={dragX}
              dragY={dragY}
              dragScale={dragScale}
              handlePointerDown={handlePointerDown}
              handlePointerMove={handlePointerMove}
              handlePointerEnd={handlePointerEnd}
              handleMouseDown={handleMouseDown}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  ) : null

  if (!mounted) return null

  return createPortal(lightbox, document.body)
}

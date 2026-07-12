'use client'

import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
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
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { framedBlockTypes, mediaBlockComponents } from '@/blocks/MediaBlockComponents'
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
  intent: 'horizontal' | 'vertical' | null
}

type DragIntent = NonNullable<DragState['intent']>

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
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
}

const ZOOM_DURATION_MS = 560
const BACKDROP_FADE_DELAY_SECONDS = 0.1

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

function getFlipTransform(
  sourceRect: LightboxRect,
  targetRect: LightboxRect,
  contentRect: LightboxRect = targetRect,
) {
  const scaleX = sourceRect.width / contentRect.width
  const scaleY = sourceRect.height / contentRect.height

  return {
    x: sourceRect.left - targetRect.left - (contentRect.left - targetRect.left) * scaleX,
    y: sourceRect.top - targetRect.top - (contentRect.top - targetRect.top) * scaleY,
    scaleX,
    scaleY,
  }
}

function getFlipCssTransform(
  sourceRect: LightboxRect,
  targetRect: LightboxRect,
  contentRect?: LightboxRect,
) {
  const transform = getFlipTransform(sourceRect, targetRect, contentRect)

  return `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scaleX}, ${transform.scaleY})`
}

function getRenderedContentRect(root: HTMLElement | null) {
  if (!root) return undefined

  for (const child of root.children) {
    if (!(child instanceof HTMLElement)) continue
    const rect = getElementRect(child)
    if (rect) return rect
  }

  return undefined
}

function ModuleSlide({
  slide,
  active,
  sourceRect,
  sourceAspectRatio,
}: {
  slide: ModuleLightboxSlide
  active: boolean
  sourceRect?: LightboxRect
  sourceAspectRatio?: number
}) {
  const Component = mediaBlockComponents[slide.block?.blockType]

  if (!Component) return null

  const isFramed = framedBlockTypes.includes(slide.block?.blockType)
  const component = (
    <Component
      {...slide.block}
      _active={active}
      _containedInLightbox={isFramed}
      _lightboxAspectRatio={sourceAspectRatio}
      _likeTargetId={null}
      _mode="lightbox"
      _sourceContentWidth={sourceRect?.width
        ? sourceRect.width - 2 * (typeof window !== 'undefined' && window.innerWidth >= 1280 ? 40 : typeof window !== 'undefined' && window.innerWidth >= 810 ? 32 : 20)
        : undefined}
    />
  )

  if (isFramed && sourceAspectRatio) {
    const sourceWidth = sourceRect?.width
    const scaledPaddingStyle = sourceWidth
      ? {
        '--frame-pad-mobile': `${(20 / sourceWidth) * 100}%`,
        '--frame-pad-tablet': `${(32 / sourceWidth) * 100}%`,
        '--frame-pad-desktop': `${(40 / sourceWidth) * 100}%`,
        '--frame-pad-y-mobile': `${((slide.block?.blockType === 'dc1' ? 24 : 20) / sourceWidth) * 100}%`,
        '--frame-pad-y-tablet': `${((slide.block?.blockType === 'dc1' ? 40 : 32) / sourceWidth) * 100}%`,
        '--frame-pad-y-desktop': `${((slide.block?.blockType === 'dc1' ? 48 : 40) / sourceWidth) * 100}%`,
      } as CSSProperties
      : undefined

    return (
      <div
        className={cn(
          'bg-background-alt',
          scaledPaddingStyle
            ? 'px-[var(--frame-pad-mobile)] py-[var(--frame-pad-y-mobile)] tablet:px-[var(--frame-pad-tablet)] tablet:py-[var(--frame-pad-y-tablet)] desktop:px-[var(--frame-pad-desktop)] desktop:py-[var(--frame-pad-y-desktop)]'
            : 'p-5 tablet:p-8 desktop:p-10',
          !scaledPaddingStyle && slide.block?.blockType === 'dc1' ? 'py-6 tablet:py-10 desktop:py-12' : '',
        )}
        style={{
          ...scaledPaddingStyle,
          aspectRatio: sourceAspectRatio,
          width: `min(calc(100dvw - 32px), calc((100dvh - 128px) * ${sourceAspectRatio}))`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center" style={{ containerType: 'size' }}>
          {component}
        </div>
      </div>
    )
  }

  return component
}

function ModuleLightboxSlideView({
  slide,
  direction,
  transitionMode,
  closing,
  prefersReducedMotion,
  entrySourceRect,
  exitSourceRect,
  sourceAspectRatio,
  activeSlideIsFramed,
  activeSlideUsesMeasuredAspect,
  activeSlideTransition,
  onSourceReady,
  ownsDrag,
  swipeOffset,
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
  closing: boolean
  prefersReducedMotion: boolean | null
  entrySourceRect?: LightboxRect
  exitSourceRect?: LightboxRect
  sourceAspectRatio?: number
  activeSlideIsFramed: boolean
  activeSlideUsesMeasuredAspect: boolean
  activeSlideTransition: Transition
  onSourceReady: (id: string) => void
  ownsDrag: boolean
  swipeOffset: number
  dragX: ReturnType<typeof useMotionValue<number>>
  dragY: ReturnType<typeof useMotionValue<number>>
  dragScale: ReturnType<typeof useTransform<number, number>>
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerEnd: (event: PointerEvent<HTMLDivElement>) => void
  handleMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
}) {
  const slotRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const entryAnimationRef = useRef<Animation | null>(null)
  const exitAnimationRef = useRef<Animation | null>(null)
  const isPresent = useIsPresent()
  const [ready, setReady] = useState(transitionMode !== 'zoom' || prefersReducedMotion || !entrySourceRect)
  const activeDragStyle = ownsDrag
    ? { x: dragX, y: dragY, scale: dragScale }
    : {}

  useLayoutEffect(() => {
    const element = zoomRef.current
    const targetElement = targetRef.current
    const slotElement = slotRef.current

    entryAnimationRef.current?.cancel()
    entryAnimationRef.current = null

    if (!element || !targetElement || !slotElement) {
      setReady(true)
      return
    }

    element.style.opacity = '1'
    element.style.transformOrigin = 'top left'

    if (transitionMode !== 'zoom' || prefersReducedMotion || !entrySourceRect) {
      element.style.transform = ''
      if (transitionMode === 'zoom') flushSync(() => onSourceReady(slide.id))
      element.style.visibility = 'visible'
      setReady(true)
      return
    }

    let animation: Animation | null = null
    let frameId = 0
    let cancelled = false

    const startAnimation = () => {
      if (cancelled) return

      const nextTargetRect = getElementRect(targetElement)
      if (!nextTargetRect) {
        setReady(true)
        return
      }

      const nextTransformRect = getElementRect(element) || nextTargetRect
      const nextContentRect = getRenderedContentRect(contentRef.current) || nextTargetRect
      const initialTransform = getFlipCssTransform(entrySourceRect, nextTransformRect, nextContentRect)
      const finalTransform = 'translate3d(0px, 0px, 0px) scale(1, 1)'

      element.style.transform = initialTransform
      flushSync(() => onSourceReady(slide.id))
      element.style.visibility = 'visible'
      setReady(true)

      if (typeof element.animate !== 'function') {
        element.style.transform = finalTransform
        return
      }

      animation = element.animate([
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
    }

    frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(startAnimation)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      if (entryAnimationRef.current === animation) {
        entryAnimationRef.current = null
      }
      animation?.cancel()
    }
  }, [entrySourceRect, onSourceReady, prefersReducedMotion, slide.id, transitionMode])

  useLayoutEffect(() => {
    const slotElement = slotRef.current

    exitAnimationRef.current?.cancel()
    exitAnimationRef.current = null

    if (
      !closing
      || transitionMode !== 'zoom'
      || prefersReducedMotion
      || !exitSourceRect
      || !slotElement
      || typeof slotElement.animate !== 'function'
    ) return

    const targetElement = targetRef.current
    const nextSlotRect = getElementRect(slotElement)
    const nextTargetRect = getElementRect(targetElement)
    const nextContentRect = getRenderedContentRect(contentRef.current)
    if (!targetElement || !nextSlotRect || !nextTargetRect || !nextContentRect) return

    const renderedTargetScale = targetElement.offsetWidth > 0
      ? nextTargetRect.width / targetElement.offsetWidth
      : 1
    const baseTargetLeft = nextSlotRect.left + targetElement.offsetLeft
    const baseTargetTop = nextSlotRect.top + targetElement.offsetTop
    const exitContentRect = {
      left: baseTargetLeft + (nextContentRect.left - nextTargetRect.left) / renderedTargetScale,
      top: baseTargetTop + (nextContentRect.top - nextTargetRect.top) / renderedTargetScale,
      width: nextContentRect.width / renderedTargetScale,
      height: nextContentRect.height / renderedTargetScale,
    }
    const finalTransform = getFlipCssTransform(exitSourceRect, nextSlotRect, exitContentRect)
    const animation = slotElement.animate([
      { transform: 'translate3d(0px, 0px, 0px) scale(1, 1)', opacity: 1 },
      { transform: finalTransform, opacity: 1 },
    ], ZOOM_ENTRY_TIMING)

    exitAnimationRef.current = animation
    animation.onfinish = () => {
      if (exitAnimationRef.current === animation) exitAnimationRef.current = null
    }
    animation.oncancel = () => {
      if (exitAnimationRef.current === animation) exitAnimationRef.current = null
    }

    return () => {
      if (exitAnimationRef.current === animation) exitAnimationRef.current = null
      animation.cancel()
    }
  }, [closing, exitSourceRect, prefersReducedMotion, transitionMode])

  const slotExitTransform = transitionMode === 'dismiss' && !prefersReducedMotion
      ? { y: 220, scale: 0.86, opacity: 0 }
      : { opacity: 1 }

  const swipeEntryX = direction > 0
    ? `calc(100vw + ${swipeOffset}px)`
    : `calc(-100vw + ${swipeOffset}px)`
  const slideExitTransform = transitionMode === 'swipe' && !prefersReducedMotion
    ? { x: direction > 0 ? '-100vw' : '100vw', opacity: 1 }
    : slotExitTransform

  return (
    <motion.div
      ref={slotRef}
      key={slide.id}
      data-lightbox-slide={slide.id}
      data-lightbox-present={isPresent ? 'true' : 'false'}
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-14 tablet:px-12 tablet:py-16 desktop:px-20"
      initial={
        transitionMode === 'swipe' && !prefersReducedMotion
          ? { x: swipeEntryX, opacity: 1 }
          : false
      }
      animate={
        transitionMode === 'swipe'
          ? { x: 0, opacity: 1 }
          : undefined
      }
      exit={slideExitTransform}
      transition={activeSlideTransition}
      style={{
        zIndex: isPresent ? 1 : 0,
        transformOrigin: 'top left',
        willChange: 'transform',
      }}
    >
      <motion.div
        ref={targetRef}
        className={cn(
          isPresent ? 'pointer-events-auto' : 'pointer-events-none',
          activeSlideIsFramed
            ? 'w-fit max-w-[calc(100dvw-32px)]'
            : activeSlideUsesMeasuredAspect
              ? 'w-[calc(100dvw-32px)] max-w-[1440px]'
              : 'w-full max-w-[min(1440px,100%)]',
        )}
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
            ref={contentRef}
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
            <ModuleSlide
              slide={slide}
              active
              sourceRect={entrySourceRect || exitSourceRect}
              sourceAspectRatio={sourceAspectRatio}
            />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ModuleLightboxOverlay({
  slides,
  initialIndex,
  initialSourceRect,
  getSourceRect,
  getSourceAspectRatio,
  onSourceReady,
  onClosing,
  onReturnCancelled,
  onClosed,
}: ModuleLightboxOverlayProps) {
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0)
  const [transitionMode, setTransitionMode] = useState<TransitionMode>('zoom')
  const [mounted, setMounted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [closingSlide, setClosingSlide] = useState<ModuleLightboxSlide | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const dragState = useRef<DragState | null>(null)
  const sourceHiddenForDragRef = useRef(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [entrySourceRect, setEntrySourceRect] = useState<LightboxRect | undefined>(initialSourceRect)
  const [exitSourceRect, setExitSourceRect] = useState<LightboxRect | undefined>()
  const [dragOwnerId, setDragOwnerId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const dragScale = useTransform(dragY, [0, 240], [1, 0.88])
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.36])
  const open = index >= 0
  const activeSlide = open ? slides[index] : null
  const renderedSlide = activeSlide || closingSlide
  const lightboxMounted = open || isClosing
  const renderedSlideIsFramed = renderedSlide
    ? framedBlockTypes.includes(renderedSlide.block?.blockType)
    : false
  const renderedSlideUsesMeasuredAspect = Boolean(renderedSlide?.preserveAspectDuringZoom)
  const renderedSlideSourceAspectRatio = renderedSlide
    ? getSourceAspectRatio(renderedSlide.id)
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
    if (sourceHiddenForDragRef.current) {
      sourceHiddenForDragRef.current = false
      if (activeSlide) onReturnCancelled(activeSlide.id)
    }
    animate(dragX, 0, ZOOM_TRANSITION)
    animate(dragY, 0, ZOOM_TRANSITION)
  }, [activeSlide, dragX, dragY, onReturnCancelled])

  const close = useCallback((mode: TransitionMode = 'zoom') => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    dragState.current = null

    const nextSourceRect = mode === 'zoom' && activeSlide
      ? getSourceRect(activeSlide.id)
      : undefined
    flushSync(() => {
      if (mode === 'zoom' && activeSlide && nextSourceRect) {
        onClosing(activeSlide.id)
      }
      setExitSourceRect(nextSourceRect)
      setTransitionMode(mode)
      setClosingSlide(activeSlide)
      setIsClosing(true)
    })
    sourceHiddenForDragRef.current = false

    setIndex(-1)
    animate(dragX, 0, ZOOM_EXIT_TRANSITION)
    animate(dragY, 0, ZOOM_EXIT_TRANSITION)

    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      setClosingSlide(null)
      dragX.set(0)
      dragY.set(0)
      closeTimeoutRef.current = null
      setEntrySourceRect(undefined)
      setExitSourceRect(undefined)
      onClosed()
    }, prefersReducedMotion ? 220 : 560)
  }, [activeSlide, dragX, dragY, getSourceRect, onClosed, onClosing, prefersReducedMotion])

  const navigate = useCallback((increment: number) => {
    if (slides.length <= 1 || index < 0) {
      resetDrag()
      return
    }

    const nextSwipeOffset = dragOwnerId === activeSlide?.id ? dragX.get() : 0
    if (sourceHiddenForDragRef.current) {
      sourceHiddenForDragRef.current = false
    }
    const nextIndex = wrapIndex(index + increment, slides.length)
    const nextSlide = slides[nextIndex]
    setEntrySourceRect(undefined)
    setExitSourceRect(undefined)

    flushSync(() => {
      onClosing(nextSlide.id)
      setDirection(increment)
      setSwipeOffset(nextSwipeOffset)
      setTransitionMode('swipe')
    })

    setIndex(nextIndex)
    animate(dragX, 0, SWIPE_TRANSITION)
    animate(dragY, 0, SWIPE_TRANSITION)
  }, [activeSlide?.id, dragOwnerId, dragX, dragY, index, onClosing, resetDrag, slides])

  const completeDrag = useCallback((
    intent: DragIntent | null,
    offsetX: number,
    offsetY: number,
    velocityX: number,
  ) => {
    const absX = Math.abs(offsetX)

    if (intent === 'vertical') {
      if (offsetY > 120) {
        close('zoom')
        return
      }

      resetDrag()
      return
    }

    if (intent === 'horizontal' && slides.length > 1 && (absX > 90 || Math.abs(velocityX) > 620)) {
      navigate(offsetX < 0 ? 1 : -1)
      return
    }

    resetDrag()
  }, [close, navigate, resetDrag, slides.length])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof HTMLElement && target.closest('button,a,input,textarea,select,summary')) return

    setDragOwnerId(activeSlide?.id ?? null)
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
      intent: null,
    }
  }, [activeSlide?.id])

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

    if (!state.intent && Math.hypot(offsetX, rawOffsetY) >= 8) {
      state.intent = rawOffsetY > 0 && Math.abs(rawOffsetY) > Math.abs(offsetX)
        ? 'vertical'
        : 'horizontal'

      if (state.intent === 'vertical' && activeSlide && !sourceHiddenForDragRef.current) {
        sourceHiddenForDragRef.current = true
        onClosing(activeSlide.id)
      }
    }

    if (state.intent === 'horizontal') {
      dragX.set(offsetX)
      dragY.set(0)
    } else if (state.intent === 'vertical') {
      dragX.set(0)
      dragY.set(rubberBandDismissOffset(offsetY))
    }
  }, [activeSlide, dragX, dragY, onClosing])

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
    completeDrag(state.intent, offsetX, offsetY, state.velocityX)
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
      intent: null,
    }

    setDragOwnerId(activeSlide?.id ?? null)
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

      if (!currentState.intent && Math.hypot(offsetX, rawOffsetY) >= 8) {
        currentState.intent = rawOffsetY > 0 && Math.abs(rawOffsetY) > Math.abs(offsetX)
          ? 'vertical'
          : 'horizontal'

        if (currentState.intent === 'vertical' && activeSlide && !sourceHiddenForDragRef.current) {
          sourceHiddenForDragRef.current = true
          onClosing(activeSlide.id)
        }
      }

      if (currentState.intent === 'horizontal') {
        dragX.set(offsetX)
        dragY.set(0)
      } else if (currentState.intent === 'vertical') {
        dragX.set(0)
        dragY.set(rubberBandDismissOffset(offsetY))
      }
    }

    const handleWindowMouseUp = (mouseEvent: globalThis.MouseEvent) => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)

      const currentState = dragState.current
      if (!currentState || currentState !== state) return

      dragState.current = null
      completeDrag(
        currentState.intent,
        mouseEvent.clientX - currentState.startX,
        Math.max(0, mouseEvent.clientY - currentState.startY),
        currentState.velocityX,
      )
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
  }, [activeSlide, completeDrag, dragX, dragY, onClosing])

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
        transition={open ? { ...FADE_TRANSITION, delay: BACKDROP_FADE_DELAY_SECONDS } : FADE_TRANSITION}
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

      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false} mode="sync">
          {renderedSlide && (
            <ModuleLightboxSlideView
              key={renderedSlide.id}
              slide={renderedSlide}
              direction={direction}
              transitionMode={transitionMode}
              closing={isClosing}
              prefersReducedMotion={prefersReducedMotion}
              entrySourceRect={entrySourceRect}
              exitSourceRect={exitSourceRect}
              sourceAspectRatio={renderedSlideSourceAspectRatio}
              activeSlideIsFramed={renderedSlideIsFramed}
              activeSlideUsesMeasuredAspect={renderedSlideUsesMeasuredAspect}
              activeSlideTransition={activeSlideTransition}
              onSourceReady={onSourceReady}
              ownsDrag={renderedSlide.id === dragOwnerId}
              swipeOffset={swipeOffset}
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

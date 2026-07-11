'use client'

import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from 'motion/react'
import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { mediaBlockComponents, phoneFrameBlockTypes } from '@/blocks/MediaBlockComponents'
import { ModuleLikeButton } from '@/components/ModuleLikeButton'
import { cn } from '@/lib/cn'

export type ModuleLightboxSlide = {
  id: string
  type: 'module'
  block: any
  label: string
  likeTargetId?: string | null
  preserveAspectDuringZoom?: boolean
}

type ModuleLightboxContextValue = {
  openSlide: (id: string, sourceAspectRatio?: number) => void
  registerSlideAspectRatio: (id: string, sourceAspectRatio: number) => void
}

const ModuleLightboxContext = createContext<ModuleLightboxContextValue | null>(null)

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

type CloseOptions = {
  preserveDrag?: boolean
}

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

function getLayoutId(slideId: string) {
  return `module-lightbox-${slideId}`
}

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total
}

function rubberBandDismissOffset(offset: number) {
  if (offset <= 0) return 0
  if (offset <= 260) return offset

  return 260 + (offset - 260) * 0.35
}

function isValidAspectRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getVideoElementAspectRatio(root: HTMLElement | null) {
  const video = root?.querySelector('video')
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return undefined

  return video.videoWidth / video.videoHeight
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

export function ModuleLightboxProvider({
  slides,
  children,
}: {
  slides: ModuleLightboxSlide[]
  children: ReactNode
}) {
  const [index, setIndex] = useState(-1)
  const [direction, setDirection] = useState(0)
  const [transitionMode, setTransitionMode] = useState<TransitionMode>('zoom')
  const [mounted, setMounted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isPreparingZoom, setIsPreparingZoom] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const dragState = useRef<DragState | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prepareZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourceAspectRatiosRef = useRef(new Map<string, number>())
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
    ? sourceAspectRatiosRef.current.get(activeSlide.id)
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
      if (prepareZoomTimeoutRef.current) clearTimeout(prepareZoomTimeoutRef.current)
    }
  }, [])

  const slideIndexById = useMemo(() => {
    const map = new Map<string, number>()
    slides.forEach((slide, slideIndex) => map.set(slide.id, slideIndex))
    return map
  }, [slides])

  const registerSlideAspectRatio = useCallback((id: string, sourceAspectRatio: number) => {
    if (isValidAspectRatio(sourceAspectRatio)) {
      sourceAspectRatiosRef.current.set(id, sourceAspectRatio)
    }
  }, [])

  const openSlide = useCallback((id: string, sourceAspectRatio?: number) => {
    const nextIndex = slideIndexById.get(id)
    if (typeof nextIndex === 'number') {
      if (isValidAspectRatio(sourceAspectRatio)) {
        sourceAspectRatiosRef.current.set(id, sourceAspectRatio)
      }

      dragX.set(0)
      dragY.set(0)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
      if (prepareZoomTimeoutRef.current) clearTimeout(prepareZoomTimeoutRef.current)
      setIsPreparingZoom(!prefersReducedMotion)
      prepareZoomTimeoutRef.current = setTimeout(() => {
        setIsPreparingZoom(false)
        prepareZoomTimeoutRef.current = null
      }, 180)
      setIsClosing(false)
      setDirection(0)
      setTransitionMode('zoom')
      setIndex(nextIndex)
    }
  }, [dragX, dragY, prefersReducedMotion, slideIndexById])

  const contextValue = useMemo(() => ({
    openSlide,
    registerSlideAspectRatio,
  }), [openSlide, registerSlideAspectRatio])

  const resetDrag = useCallback(() => {
    animate(dragX, 0, ZOOM_TRANSITION)
    animate(dragY, 0, ZOOM_TRANSITION)
  }, [dragX, dragY])

  const close = useCallback((mode: TransitionMode = 'zoom', options: CloseOptions = {}) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    dragState.current = null

    if (!options.preserveDrag) {
      dragX.set(0)
      dragY.set(0)
    }
    setIsPreparingZoom(false)

    flushSync(() => {
      setTransitionMode(mode)
    })

    setIsClosing(true)
    setIndex(-1)

    closeTimeoutRef.current = setTimeout(() => {
      setIsClosing(false)
      dragX.set(0)
      dragY.set(0)
      closeTimeoutRef.current = null
    }, prefersReducedMotion ? 220 : 560)
  }, [dragX, dragY, prefersReducedMotion])

  const navigate = useCallback((increment: number) => {
    if (slides.length <= 1 || index < 0) {
      resetDrag()
      return
    }

    dragX.set(0)
    dragY.set(0)
    setIsPreparingZoom(false)

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
      close('zoom', { preserveDrag: true })
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
            <motion.div
              key={activeSlide.id}
              layoutId={transitionMode === 'zoom' && !prefersReducedMotion ? getLayoutId(activeSlide.id) : undefined}
              layoutCrossfade={false}
              layout
              custom={direction}
              className={cn(
                'cursor-grab touch-none active:cursor-grabbing',
                activeSlideIsPhoneFrame
                  ? 'w-fit max-w-[calc(100dvw-32px)]'
                  : activeSlideUsesMeasuredAspect
                    ? 'w-[calc(100dvw-32px)] max-w-[1440px]'
                    : 'w-full max-w-[min(1440px,100%)]',
              )}
              style={{
                ...(transitionMode === 'swipe' ? {} : { x: dragX }),
                y: dragY,
                scale: dragScale,
                visibility: isPreparingZoom && transitionMode === 'zoom' ? 'hidden' : 'visible',
                willChange: 'transform',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              initial={
                transitionMode === 'swipe' && !prefersReducedMotion
                  ? { x: direction > 0 ? '100vw' : '-100vw', opacity: 1 }
                  : { opacity: 1 }
              }
              animate={{ x: 0, opacity: 1 }}
              exit={
                transitionMode === 'dismiss' && !prefersReducedMotion
                  ? { y: 220, scale: 0.86, opacity: 0 }
                  : transitionMode === 'swipe' && !prefersReducedMotion
                    ? { x: direction > 0 ? '-100vw' : '100vw', opacity: 1 }
                    : { opacity: 1 }
              }
              transition={activeSlideTransition}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onMouseDown={handleMouseDown}
              onLayoutAnimationStart={() => {
                if (prepareZoomTimeoutRef.current) clearTimeout(prepareZoomTimeoutRef.current)
                prepareZoomTimeoutRef.current = null
                setIsPreparingZoom(false)
              }}
              onDragStartCapture={(event) => event.preventDefault()}
              onClick={(event) => event.stopPropagation()}
            >
              <ModuleSlide slide={activeSlide} active sourceAspectRatio={activeSlideSourceAspectRatio} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  ) : null

  return (
    <LayoutGroup id="module-lightbox">
      <ModuleLightboxContext.Provider value={contextValue}>
        {children}
        {mounted ? createPortal(lightbox, document.body) : null}
      </ModuleLightboxContext.Provider>
    </LayoutGroup>
  )
}

function shouldIgnoreClick(target: EventTarget | null) {
  return target instanceof HTMLElement
    && Boolean(target.closest('a,button,input,textarea,select,summary,[data-lightbox-ignore],video[controls]'))
}

export function ModuleLightboxTrigger({
  slideId,
  label,
  className,
  fallbackAspectRatio,
  preserveAspectDuringZoom = false,
  children,
}: {
  slideId: string
  label: string
  className?: string
  fallbackAspectRatio?: number
  preserveAspectDuringZoom?: boolean
  children: ReactNode
}) {
  const context = useContext(ModuleLightboxContext)
  const triggerRef = useRef<HTMLDivElement>(null)
  const openFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current)
    }
  }, [])

  const measureAspectRatio = useCallback(() => {
    const trigger = triggerRef.current
    const fallback = isValidAspectRatio(fallbackAspectRatio) ? fallbackAspectRatio : undefined
    const videoAspectRatio = getVideoElementAspectRatio(trigger)
    const stableFallback = fallback || videoAspectRatio
    const hasFixedModuleHeight = Boolean(trigger?.querySelector('[style*="--row-height"]'))

    if (stableFallback && !hasFixedModuleHeight) return stableFallback

    const rect = trigger?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || rect.height <= 0) return undefined

    const measuredAspectRatio = rect.width / rect.height

    if (
      stableFallback
      && (
        measuredAspectRatio > stableFallback * 1.4
        || measuredAspectRatio < stableFallback / 1.4
      )
    ) {
      return stableFallback
    }

    return measuredAspectRatio
  }, [fallbackAspectRatio])

  const registerMeasuredAspectRatio = useCallback(() => {
    if (!preserveAspectDuringZoom || !context) return undefined

    const sourceAspectRatio = measureAspectRatio()
    if (isValidAspectRatio(sourceAspectRatio)) {
      context.registerSlideAspectRatio(slideId, sourceAspectRatio)
    }

    return sourceAspectRatio
  }, [context, measureAspectRatio, preserveAspectDuringZoom, slideId])

  useLayoutEffect(() => {
    if (!context || !preserveAspectDuringZoom || !triggerRef.current) return

    registerMeasuredAspectRatio()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', registerMeasuredAspectRatio)
      return () => window.removeEventListener('resize', registerMeasuredAspectRatio)
    }

    const observer = new ResizeObserver(registerMeasuredAspectRatio)
    observer.observe(triggerRef.current)

    return () => observer.disconnect()
  }, [context, preserveAspectDuringZoom, registerMeasuredAspectRatio])

  if (!context) return <>{children}</>

  const open = () => {
    const sourceAspectRatio = preserveAspectDuringZoom
      ? registerMeasuredAspectRatio()
      : undefined

    if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current)
    openFrameRef.current = requestAnimationFrame(() => {
      openFrameRef.current = null
      context.openSlide(slideId, sourceAspectRatio)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }

  return (
    <motion.div
      ref={triggerRef}
      layoutId={getLayoutId(slideId)}
      layoutCrossfade={false}
      layout
      transition={ZOOM_TRANSITION}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={cn(
        'relative block w-full cursor-zoom-in touch-manipulation outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-content/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background',
        className,
      )}
      onClickCapture={(event) => {
        if (!shouldIgnoreClick(event.target)) {
          event.preventDefault()
          open()
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </motion.div>
  )
}

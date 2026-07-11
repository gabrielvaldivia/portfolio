'use client'

import dynamic from 'next/dynamic'
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

export type ModuleLightboxSlide = {
  id: string
  type: 'module'
  block: any
  label: string
  likeTargetId?: string | null
  preserveAspectDuringZoom?: boolean
}

export type LightboxRect = {
  top: number
  left: number
  width: number
  height: number
}

export type ModuleLightboxOverlayProps = {
  slides: ModuleLightboxSlide[]
  initialIndex: number
  initialSourceRect?: LightboxRect
  getSourceRect: (id: string) => LightboxRect | undefined
  getSourceAspectRatio: (id: string) => number | undefined
  onClosed: () => void
}

type ModuleLightboxContextValue = {
  openSlide: (id: string, sourceAspectRatio?: number, sourceRect?: LightboxRect) => void
  registerSlideAspectRatio: (id: string, sourceAspectRatio: number) => void
  registerSlideElement: (id: string, element: HTMLElement | null) => void
}

type OpenLightboxState = {
  key: number
  index: number
  sourceRect?: LightboxRect
}

const DynamicModuleLightboxOverlay = dynamic(
  () => import('./ModuleLightboxOverlay').then((mod) => mod.ModuleLightboxOverlay),
  { ssr: false },
)

const ModuleLightboxContext = createContext<ModuleLightboxContextValue | null>(null)

export function preloadModuleLightboxOverlay() {
  void import('./ModuleLightboxOverlay')
}

function isValidAspectRatio(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getVideoElementAspectRatio(root: HTMLElement | null) {
  const video = root?.querySelector('video')
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return undefined

  return video.videoWidth / video.videoHeight
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

export function ModuleLightboxProvider({
  slides,
  children,
}: {
  slides: ModuleLightboxSlide[]
  children: ReactNode
}) {
  const [openState, setOpenState] = useState<OpenLightboxState | null>(null)
  const openKeyRef = useRef(0)
  const sourceAspectRatiosRef = useRef(new Map<string, number>())
  const sourceElementsRef = useRef(new Map<string, HTMLElement>())
  const sourceRectsRef = useRef(new Map<string, LightboxRect>())

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

  const registerSlideElement = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      sourceElementsRef.current.set(id, element)
      const rect = getElementRect(element)
      if (rect) sourceRectsRef.current.set(id, rect)
      return
    }

    sourceElementsRef.current.delete(id)
  }, [])

  const getSourceRect = useCallback((id: string) => {
    const rect = getElementRect(sourceElementsRef.current.get(id) ?? null)
    if (rect) {
      sourceRectsRef.current.set(id, rect)
      return rect
    }

    return sourceRectsRef.current.get(id)
  }, [])

  const getSourceAspectRatio = useCallback((id: string) => {
    return sourceAspectRatiosRef.current.get(id)
  }, [])

  const openSlide = useCallback((id: string, sourceAspectRatio?: number, sourceRect?: LightboxRect) => {
    const nextIndex = slideIndexById.get(id)
    if (typeof nextIndex !== 'number') return

    if (isValidAspectRatio(sourceAspectRatio)) {
      sourceAspectRatiosRef.current.set(id, sourceAspectRatio)
    }

    const nextSourceRect = sourceRect || getSourceRect(id)
    if (nextSourceRect) sourceRectsRef.current.set(id, nextSourceRect)

    preloadModuleLightboxOverlay()
    openKeyRef.current += 1
    setOpenState({
      key: openKeyRef.current,
      index: nextIndex,
      sourceRect: nextSourceRect,
    })
  }, [getSourceRect, slideIndexById])

  const handleClosed = useCallback(() => {
    setOpenState(null)
  }, [])

  const contextValue = useMemo(() => ({
    openSlide,
    registerSlideAspectRatio,
    registerSlideElement,
  }), [openSlide, registerSlideAspectRatio, registerSlideElement])

  return (
    <ModuleLightboxContext.Provider value={contextValue}>
      {children}
      {openState && (
        <DynamicModuleLightboxOverlay
          key={openState.key}
          slides={slides}
          initialIndex={openState.index}
          initialSourceRect={openState.sourceRect}
          getSourceRect={getSourceRect}
          getSourceAspectRatio={getSourceAspectRatio}
          onClosed={handleClosed}
        />
      )}
    </ModuleLightboxContext.Provider>
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

  useLayoutEffect(() => {
    return () => {
      if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (!context || !triggerRef.current) return

    context.registerSlideElement(slideId, triggerRef.current)
    return () => context.registerSlideElement(slideId, null)
  }, [context, slideId])

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
    preloadModuleLightboxOverlay()
    if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current)
    openFrameRef.current = requestAnimationFrame(() => {
      const sourceAspectRatio = preserveAspectDuringZoom
        ? registerMeasuredAspectRatio()
        : undefined
      const sourceRect = getElementRect(triggerRef.current)

      openFrameRef.current = null
      context.openSlide(slideId, sourceAspectRatio, sourceRect)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }

  return (
    <div
      ref={triggerRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={cn(
        'relative block w-full cursor-zoom-in touch-manipulation outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-content/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background',
        className,
      )}
      onPointerEnter={preloadModuleLightboxOverlay}
      onFocus={preloadModuleLightboxOverlay}
      onClickCapture={(event) => {
        if (!shouldIgnoreClick(event.target)) {
          event.preventDefault()
          open()
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
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
import { ModuleLightboxControlProvider } from '@/components/ModuleLightboxControlContext'

export type ModuleLightboxSlide = {
  id: string
  type: 'module'
  block: any
  label: string
  likeTargetId?: string | null
  preserveAspectDuringZoom?: boolean
  movableSurface?: boolean
}

export type MovableModuleSurface = {
  element: HTMLDivElement
  slot: HTMLDivElement
  sourcePaddingRatios?: {
    top: number
    right: number
    bottom: number
    left: number
  }
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
  getMovableSurface: (id: string) => MovableModuleSurface | undefined
  onSourceReady: (id: string) => void
  onClosing: (id: string) => void
  onSourceReveal: (id: string) => void
  onReturnCancelled: (id: string) => void
  onClosed: () => void
}

type ModuleLightboxContextValue = {
  hiddenSlideId: string | null
  openSlide: (id: string, sourceAspectRatio?: number, sourceRect?: LightboxRect) => void
  registerSlideAspectRatio: (id: string, sourceAspectRatio: number) => void
  registerSlideElement: (id: string, element: HTMLElement | null) => void
  registerMovableSurface: (id: string, surface: MovableModuleSurface | null) => void
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

function getSurfacePaddingRatios(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0) return undefined

  const style = getComputedStyle(element)
  return {
    top: parseFloat(style.paddingTop) / rect.width || 0,
    right: parseFloat(style.paddingRight) / rect.width || 0,
    bottom: parseFloat(style.paddingBottom) / rect.width || 0,
    left: parseFloat(style.paddingLeft) / rect.width || 0,
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
  const [hiddenSlideId, setHiddenSlideId] = useState<string | null>(null)
  const openKeyRef = useRef(0)
  const sourceAspectRatiosRef = useRef(new Map<string, number>())
  const sourceElementsRef = useRef(new Map<string, HTMLElement>())
  const sourceRectsRef = useRef(new Map<string, LightboxRect>())
  const movableSurfacesRef = useRef(new Map<string, MovableModuleSurface>())

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

  const registerMovableSurface = useCallback((id: string, surface: MovableModuleSurface | null) => {
    if (surface) {
      movableSurfacesRef.current.set(id, {
        ...surface,
        sourcePaddingRatios: getSurfacePaddingRatios(surface.element),
      })
    } else {
      movableSurfacesRef.current.delete(id)
    }
  }, [])

  const getMovableSurface = useCallback((id: string) => {
    const surface = movableSurfacesRef.current.get(id)
    if (!surface || surface.element.dataset.lightboxSurfaceState !== 'source') return surface

    const measuredSurface = {
      ...surface,
      sourcePaddingRatios: getSurfacePaddingRatios(surface.element),
    }
    movableSurfacesRef.current.set(id, measuredSurface)
    return measuredSurface
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
    setHiddenSlideId(null)
    setOpenState(null)
  }, [])

  const handleClosing = useCallback((id: string) => {
    setHiddenSlideId(id)
  }, [])

  const handleSourceReady = useCallback((id: string) => {
    setHiddenSlideId(id)
  }, [])

  const handleSourceReveal = useCallback((id: string) => {
    setHiddenSlideId((hiddenId) => hiddenId === id ? null : hiddenId)
  }, [])

  const handleReturnCancelled = useCallback((id: string) => {
    setHiddenSlideId(id)
  }, [])

  const contextValue = useMemo(() => ({
    hiddenSlideId,
    openSlide,
    registerSlideAspectRatio,
    registerSlideElement,
    registerMovableSurface,
  }), [hiddenSlideId, openSlide, registerMovableSurface, registerSlideAspectRatio, registerSlideElement])

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
          getMovableSurface={getMovableSurface}
          onSourceReady={handleSourceReady}
          onClosing={handleClosing}
          onSourceReveal={handleSourceReveal}
          onReturnCancelled={handleReturnCancelled}
          onClosed={handleClosed}
        />
      )}
    </ModuleLightboxContext.Provider>
  )
}

function shouldIgnoreClick(target: EventTarget | null) {
  return target instanceof Element
    && Boolean(target.closest('a,button,input,textarea,select,summary,[data-lightbox-ignore],video[controls]'))
}

export function ModuleLightboxTrigger({
  slideId,
  label,
  className,
  surfaceClassName,
  fallbackAspectRatio,
  preserveAspectDuringZoom = false,
  sourceContainer = false,
  movableSurface = false,
  openOnClick = true,
  children,
}: {
  slideId: string
  label: string
  className?: string
  surfaceClassName?: string
  fallbackAspectRatio?: number
  preserveAspectDuringZoom?: boolean
  sourceContainer?: boolean
  movableSurface?: boolean
  openOnClick?: boolean
  children: ReactNode
}) {
  const context = useContext(ModuleLightboxContext)
  const registerMovableSurface = context?.registerMovableSurface
  const triggerRef = useRef<HTMLDivElement>(null)
  const openFrameRef = useRef<number | null>(null)
  const [surfaceElement, setSurfaceElement] = useState<HTMLDivElement | null>(null)
  const getSourceElement = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger || !sourceContainer) return trigger

    return trigger.closest<HTMLElement>('[data-lightbox-source-container]') || trigger
  }, [sourceContainer])

  useLayoutEffect(() => {
    if (!movableSurface || surfaceElement) return

    const element = document.createElement('div')
    element.className = cn(
      'h-full w-full max-w-full',
      surfaceClassName,
    )
    element.dataset.lightboxSurfaceState = 'source'
    setSurfaceElement(element)
  }, [movableSurface, surfaceClassName, surfaceElement])

  useLayoutEffect(() => {
    if (!surfaceElement) return
    surfaceElement.className = cn(
      'h-full w-full max-w-full',
      surfaceClassName,
    )
  }, [surfaceClassName, surfaceElement])

  useLayoutEffect(() => {
    const slot = triggerRef.current
    if (!registerMovableSurface || !movableSurface || !surfaceElement || !slot) return

    slot.appendChild(surfaceElement)
    registerMovableSurface(slideId, { element: surfaceElement, slot })

    return () => registerMovableSurface(slideId, null)
  }, [movableSurface, registerMovableSurface, slideId, surfaceElement])

  useLayoutEffect(() => {
    return () => {
      if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    const sourceElement = getSourceElement()
    if (!context || !sourceElement) return

    context.registerSlideElement(slideId, sourceElement)
    return () => context.registerSlideElement(slideId, null)
  }, [context, getSourceElement, slideId])

  const measureAspectRatio = useCallback(() => {
    const trigger = triggerRef.current
    const sourceElement = getSourceElement()
    const fallback = isValidAspectRatio(fallbackAspectRatio) ? fallbackAspectRatio : undefined
    const videoAspectRatio = getVideoElementAspectRatio(trigger)
    const stableFallback = sourceContainer ? undefined : fallback || videoAspectRatio

    if (stableFallback) return stableFallback

    const rect = sourceElement?.getBoundingClientRect()
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
  }, [fallbackAspectRatio, getSourceElement, sourceContainer])

  const registerMeasuredAspectRatio = useCallback(() => {
    if (!preserveAspectDuringZoom || !context) return undefined

    const sourceAspectRatio = measureAspectRatio()
    if (isValidAspectRatio(sourceAspectRatio)) {
      context.registerSlideAspectRatio(slideId, sourceAspectRatio)
    }

    return sourceAspectRatio
  }, [context, measureAspectRatio, preserveAspectDuringZoom, slideId])

  useLayoutEffect(() => {
    const sourceElement = getSourceElement()
    if (!context || !preserveAspectDuringZoom || !sourceElement) return

    registerMeasuredAspectRatio()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', registerMeasuredAspectRatio)
      return () => window.removeEventListener('resize', registerMeasuredAspectRatio)
    }

    const observer = new ResizeObserver(registerMeasuredAspectRatio)
    observer.observe(sourceElement)

    return () => observer.disconnect()
  }, [context, getSourceElement, preserveAspectDuringZoom, registerMeasuredAspectRatio])

  const hiddenAsLightboxSource = context?.hiddenSlideId === slideId

  useLayoutEffect(() => {
    if (movableSurface || !sourceContainer || !hiddenAsLightboxSource) return

    const sourceElement = getSourceElement()
    if (!sourceElement) return

    const previousVisibility = sourceElement.style.visibility
    sourceElement.style.visibility = 'hidden'

    return () => {
      sourceElement.style.visibility = previousVisibility
    }
  }, [getSourceElement, hiddenAsLightboxSource, movableSurface, sourceContainer])

  if (!context) return <>{children}</>

  const open = () => {
    if (movableSurface && surfaceElement?.dataset.lightboxSurfaceState === 'overlay') return

    preloadModuleLightboxOverlay()
    if (openFrameRef.current !== null) cancelAnimationFrame(openFrameRef.current)
    openFrameRef.current = requestAnimationFrame(() => {
      const sourceAspectRatio = preserveAspectDuringZoom
        ? registerMeasuredAspectRatio()
        : undefined
      const sourceRect = getElementRect(getSourceElement())

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
    <ModuleLightboxControlProvider open={open}>
      <div
        ref={triggerRef}
        role={openOnClick ? 'button' : undefined}
        tabIndex={openOnClick ? (hiddenAsLightboxSource ? -1 : 0) : undefined}
        aria-label={openOnClick ? label : undefined}
        aria-hidden={hiddenAsLightboxSource || undefined}
        className={cn(
          'relative block w-full touch-manipulation outline-none transition-opacity duration-150',
          openOnClick ? 'cursor-zoom-in focus-visible:ring-2 focus-visible:ring-content/50 focus-visible:ring-offset-4 focus-visible:ring-offset-background' : '',
          !movableSurface && hiddenAsLightboxSource ? 'invisible opacity-0' : 'opacity-100',
          className,
        )}
        onPointerEnter={preloadModuleLightboxOverlay}
        onFocus={preloadModuleLightboxOverlay}
        onClickCapture={(event) => {
          if (
            openOnClick
            &&
            !(movableSurface && surfaceElement?.dataset.lightboxSurfaceState === 'overlay')
            && !shouldIgnoreClick(event.target)
          ) {
            event.preventDefault()
            open()
          }
        }}
        onKeyDown={openOnClick ? handleKeyDown : undefined}
      >
        {movableSurface && surfaceElement ? createPortal(children, surfaceElement) : children}
      </div>
    </ModuleLightboxControlProvider>
  )
}

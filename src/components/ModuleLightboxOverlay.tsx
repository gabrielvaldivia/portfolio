'use client'

import Image from 'next/image'
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
  type RefObject,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { framedBlockTypes, mediaBlockComponents } from '@/blocks/MediaBlockComponents'
import { ModuleLikeButton } from '@/components/ModuleLikeButton'
import { cn } from '@/lib/cn'
import type {
  LightboxRect,
  ModuleLightboxOverlayProps,
  ModuleLightboxPhotoExif,
  ModuleLightboxSlide,
  MovableModuleSurface,
} from '@/components/ModuleLightbox'

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

type PhotoZoomValues = {
  x: number
  y: number
  scale: number
}

type PhotoPointerPosition = {
  pointerId: number
  x: number
  y: number
}

type PhotoGestureState =
  | {
    mode: 'pan'
    pointerId: number
    startX: number
    startY: number
    startPanX: number
    startPanY: number
    startScale: number
    moved: boolean
  }
  | {
    mode: 'pinch'
    pointerIds: [number, number]
    startDistance: number
    startPanX: number
    startPanY: number
    startScale: number
  }

type PhotoTapCandidate = {
  pointerId: number
  startX: number
  startY: number
  startTime: number
  moved: boolean
}

type PhotoLastTap = {
  slideId: string
  time: number
  x: number
  y: number
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

const INFO_DISMISS_TRANSITION: Transition = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
}

const INFO_DISMISS_THRESHOLD = 36
const INFO_COUNTER_DRAG_LIMIT = 90
const INFO_COUNTER_DRAG_RESISTANCE = 0.55

const SWIPE_TRANSITION: Transition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
}

const ZOOM_DURATION_MS = 560
const SOURCE_REVEAL_PROGRESS = 0.65
const BACKDROP_FADE_DELAY_SECONDS = 0.1
const PHOTO_LIGHTBOX_VERTICAL_OFFSET = 132
const PHOTO_MAX_SCALE = 6
const PHOTO_ZOOM_EPSILON = 0.01
const PHOTO_TAP_MOVE_TOLERANCE = 12
const PHOTO_TAP_MAX_DURATION_MS = 450
const PHOTO_DOUBLE_TAP_DELAY_MS = 320
const PHOTO_DOUBLE_TAP_DISTANCE = 44
const PHOTO_SYNTHETIC_CLICK_SUPPRESS_MS = 520

const INTRINSIC_LIGHTBOX_ASPECT_RATIOS: Record<string, number> = {
  dc1: 718 / 960,
  iphone15: 2005 / 4096,
  iphone13mini: 553 / 1024,
  iphone5: 762 / 1597,
  iphone6: 990 / 1934,
  iphonex: 1405 / 2796,
}

const ZOOM_ENTRY_TIMING: KeyframeAnimationOptions = {
  duration: ZOOM_DURATION_MS,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'both',
}

const ZOOM_EXIT_TRANSITION: Transition = {
  duration: ZOOM_DURATION_MS / 1000,
  ease: [0.22, 1, 0.36, 1],
}

const EXIF_TILE_KEYS = [
  ['Shutter', 'shutter'],
  ['Aperture', 'aperture'],
  ['ISO', 'iso'],
  ['Focal', 'focal'],
] as const

function formatFStop(value: string | undefined) {
  if (!value) return value

  const text = String(value).trim()
  if (/^\d+(?:\.\d+)?$/.test(text)) return `ƒ/${text}`
  return text.replace(/\bf\s*\/\s*/gi, 'ƒ/')
}

function hasPhotoExif(exif: ModuleLightboxPhotoExif | undefined) {
  return Boolean(exif && Object.values(exif).some(Boolean))
}

function getExifTiles(exif: ModuleLightboxPhotoExif) {
  const tiles: Array<{ label: string; value: string }> = []

  for (const [label, key] of EXIF_TILE_KEYS) {
    const value = key === 'aperture' ? formatFStop(exif[key]) : exif[key]
    if (value) tiles.push({ label, value })
  }

  return tiles
}

function rubberBandInfoCounterDragOffset(offset: number) {
  if (offset === 0) return 0

  const direction = Math.sign(offset)
  const distance = Math.abs(offset)
  const resistedDistance = INFO_COUNTER_DRAG_LIMIT * (1 - Math.exp(-(distance * INFO_COUNTER_DRAG_RESISTANCE) / INFO_COUNTER_DRAG_LIMIT))

  return direction * resistedDistance
}

function PhotoInfoTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('min-w-0 break-words rounded-xl bg-white/[0.07] px-2 pb-3 pt-2.5 font-mono text-[13px] leading-tight text-white/90 tablet:px-4 tablet:text-[15px]', className)}>
      <span className="mb-0.5 block text-[10px] leading-tight text-white/45 tablet:text-[11px]">
        {label}
      </span>
      {value}
    </div>
  )
}

function wrapIndex(index: number, total: number) {
  return ((index % total) + total) % total
}

function getLightboxDisplayAspectRatio(slide: ModuleLightboxSlide, sourceAspectRatio?: number) {
  const blockType = slide.block?.blockType
  const intrinsicAspectRatio = INTRINSIC_LIGHTBOX_ASPECT_RATIOS[blockType]
  if (intrinsicAspectRatio) return intrinsicAspectRatio

  if (blockType === 'video' || blockType === 'fullWidthVideo') {
    const width = Number(slide.block?.video?.width)
    const height = Number(slide.block?.video?.height)
    if (width > 0 && height > 0) return width / height
  }

  return sourceAspectRatio
}

function isZoomablePhotoSlide(slide: ModuleLightboxSlide | null | undefined) {
  return Boolean(slide?.zoomablePhoto && slide.block?.blockType === 'image' && slide.block?.image?.url)
}

function getPhotoAspectRatio(slide: ModuleLightboxSlide) {
  const width = Number(slide.block?.image?.width)
  const height = Number(slide.block?.image?.height)
  return width > 0 && height > 0 ? width / height : 16 / 9
}

function getConstrainedPhotoLightboxWidth(aspectRatio: number) {
  return `min(100%, calc((100dvh - ${PHOTO_LIGHTBOX_VERTICAL_OFFSET}px) * ${aspectRatio}))`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getDistance(a: PhotoPointerPosition, b: PhotoPointerPosition) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getCenter(a: PhotoPointerPosition, b: PhotoPointerPosition) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function PhotoInfoPopover({
  info,
  prefersReducedMotion,
  onClose,
}: {
  info: ModuleLightboxSlide['photoInfo']
  prefersReducedMotion: boolean | null
  onClose: () => void
}) {
  const exif = info?.exif
  const primaryTiles = [
    exif?.camera ? { label: 'Camera', value: exif.camera } : null,
    info?.dateLabel ? { label: 'Date', value: info.dateLabel } : null,
  ].filter((tile): tile is { label: string; value: string } => tile !== null)
  const tiles = exif ? getExifTiles(exif) : []
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const dragScale = useMotionValue(1)
  const dragOpacity = useMotionValue(1)
  const handleDragRef = useRef<{
    pointerId: number
    pointerStartX: number
    pointerStartY: number
    motionStartX: number
    motionStartY: number
  } | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const resetHandleDrag = useCallback(() => {
    animate(dragX, 0, ZOOM_TRANSITION)
    animate(dragY, 0, ZOOM_TRANSITION)
    animate(dragScale, 1, ZOOM_TRANSITION)
    animate(dragOpacity, 1, ZOOM_TRANSITION)
  }, [dragOpacity, dragScale, dragX, dragY])

  const dismissHandleDrag = useCallback(() => {
    if (prefersReducedMotion) {
      onClose()
      return
    }

    animate(dragX, 0, INFO_DISMISS_TRANSITION)
    animate(dragY, 0, INFO_DISMISS_TRANSITION)
    animate(dragScale, 0.32, INFO_DISMISS_TRANSITION)
    animate(dragOpacity, 0, { duration: 0.14, ease: [0.2, 0, 0, 1] })
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null
      onClose()
    }, 180)
  }, [dragOpacity, dragScale, dragX, dragY, onClose, prefersReducedMotion])

  const handleHandlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
    dragScale.set(1)
    dragOpacity.set(1)
    handleDragRef.current = {
      pointerId: event.pointerId,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      motionStartX: dragX.get(),
      motionStartY: dragY.get(),
    }
  }, [dragOpacity, dragScale, dragX, dragY])

  const handleHandlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = handleDragRef.current
    if (!state || state.pointerId !== event.pointerId) return

    event.preventDefault()
    event.stopPropagation()
    const offsetX = event.clientX - state.pointerStartX + state.motionStartX
    const offsetY = event.clientY - state.pointerStartY + state.motionStartY
    dragX.set(rubberBandInfoCounterDragOffset(offsetX))
    dragY.set(offsetY > 0 ? offsetY : rubberBandInfoCounterDragOffset(offsetY))
  }, [dragX, dragY])

  const handleHandlePointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = handleDragRef.current
    if (!state || state.pointerId !== event.pointerId) return

    const offsetY = event.clientY - state.pointerStartY + state.motionStartY
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    handleDragRef.current = null

    if (offsetY > INFO_DISMISS_THRESHOLD) {
      dismissHandleDrag()
      return
    }

    resetHandleDrag()
  }, [dismissHandleDrag, resetHandleDrag])

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-5 bottom-[calc(1.125rem+env(safe-area-inset-bottom))] z-30 mx-auto w-[calc(100dvw-40px)] max-w-[452px] origin-bottom tablet:inset-x-10 tablet:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.68, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.68, y: 14 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
      style={{ transformOrigin: 'bottom center' }}
    >
      <motion.div
        className="pointer-events-auto cursor-grab touch-none rounded-[24px] bg-[#181818]/[0.96] p-3 text-white/[0.92] shadow-[0_8px_30px_rgba(0,0,0,0.24)] active:cursor-grabbing"
        style={{
          opacity: dragOpacity,
          scale: dragScale,
          transformOrigin: 'bottom center',
          willChange: 'transform, opacity',
          x: dragX,
          y: dragY,
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={handleHandlePointerDown}
        onPointerMove={handleHandlePointerMove}
        onPointerUp={handleHandlePointerEnd}
        onPointerCancel={handleHandlePointerEnd}
      >
        <div
          className="-mx-1 mb-2 flex cursor-grab touch-none justify-center py-1 active:cursor-grabbing"
          aria-label="Dismiss photo information"
          role="button"
          tabIndex={0}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerEnd}
          onPointerCancel={handleHandlePointerEnd}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              onClose()
            }
          }}
        >
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {primaryTiles.map((tile) => (
            <PhotoInfoTile key={tile.label} label={tile.label} value={tile.value} className="col-span-2" />
          ))}
          {tiles.map((tile) => (
            <PhotoInfoTile key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

function PhotoLightboxMeta({
  info,
  infoOpen,
  prefersReducedMotion,
  onToggleInfo,
  onCloseInfo,
}: {
  info: ModuleLightboxSlide['photoInfo']
  infoOpen: boolean
  prefersReducedMotion: boolean | null
  onToggleInfo: () => void
  onCloseInfo: () => void
}) {
  const exif = info?.exif
  const hasExif = hasPhotoExif(exif)
  const hasInfo = Boolean(info?.dateLabel || hasExif)
  if (!hasInfo) return null

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(1.125rem+env(safe-area-inset-bottom))] z-20 flex justify-center px-5 tablet:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] tablet:px-10">
        <button
          type="button"
          aria-label="Show photo information"
          aria-expanded={infoOpen}
          title="Photo information"
          className={cn(
            'flex h-8 items-center justify-center rounded-full px-1 font-mono text-[12px] uppercase leading-none text-black/45 transition-[color,opacity] duration-150 hover:text-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:text-white/45 dark:hover:text-white/70',
            infoOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100',
          )}
          onClick={(event) => {
            event.stopPropagation()
            onToggleInfo()
          }}
        >
          INFO
        </button>
      </div>

      <AnimatePresence>
        {infoOpen && (
          <PhotoInfoPopover
            key="photo-info"
            info={info}
            prefersReducedMotion={prefersReducedMotion}
            onClose={onCloseInfo}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function getPaddedSurfaceAspectRatio(contentAspectRatio: number, surface?: MovableModuleSurface) {
  const padding = surface?.sourcePaddingRatios
  if (!padding) return contentAspectRatio

  const contentWidthRatio = 1 - padding.left - padding.right
  const surfaceHeightRatio = contentWidthRatio / contentAspectRatio + padding.top + padding.bottom
  return contentWidthRatio > 0 && surfaceHeightRatio > 0
    ? 1 / surfaceHeightRatio
    : contentAspectRatio
}

function getLightboxScaleForSourceRect(sourceRect: LightboxRect) {
  if (typeof window === 'undefined') return 1

  const maxWidth = window.innerWidth - 32
  const maxHeight = window.innerHeight - 96
  return Math.min(maxWidth / sourceRect.width, maxHeight / sourceRect.height)
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
  preserveAspectRatio = false,
) {
  const scaleX = sourceRect.width / contentRect.width
  const scaleY = sourceRect.height / contentRect.height

  if (preserveAspectRatio) {
    const scale = Math.min(scaleX, scaleY)
    const scaledContentWidth = contentRect.width * scale
    const scaledContentHeight = contentRect.height * scale
    const destinationLeft = sourceRect.left + (sourceRect.width - scaledContentWidth) / 2
    const destinationTop = sourceRect.top + (sourceRect.height - scaledContentHeight) / 2

    return {
      x: destinationLeft - targetRect.left - (contentRect.left - targetRect.left) * scale,
      y: destinationTop - targetRect.top - (contentRect.top - targetRect.top) * scale,
      scaleX: scale,
      scaleY: scale,
    }
  }

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
  preserveAspectRatio = false,
) {
  const transform = getFlipTransform(sourceRect, targetRect, contentRect, preserveAspectRatio)

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

function MovableModuleSurfaceMount({ surface }: { surface: MovableModuleSurface }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    const slotHeight = surface.slot.getBoundingClientRect().height
    const previousSlotHeight = surface.slot.style.height
    const previousPadding = {
      top: surface.element.style.paddingTop,
      right: surface.element.style.paddingRight,
      bottom: surface.element.style.paddingBottom,
      left: surface.element.style.paddingLeft,
    }
    const responsiveImages = Array.from(surface.element.querySelectorAll<HTMLImageElement>('img[sizes]'))
    const previousImageSizes = responsiveImages.map((image) => image.sizes)
    if (slotHeight > 0) surface.slot.style.height = `${slotHeight}px`

    if (surface.sourcePaddingRatios) {
      surface.element.style.paddingTop = `${surface.sourcePaddingRatios.top * 100}%`
      surface.element.style.paddingRight = `${surface.sourcePaddingRatios.right * 100}%`
      surface.element.style.paddingBottom = `${surface.sourcePaddingRatios.bottom * 100}%`
      surface.element.style.paddingLeft = `${surface.sourcePaddingRatios.left * 100}%`
    }

    surface.element.dataset.lightboxSurfaceState = 'overlay'
    surface.element.style.setProperty('--lightbox-phone-surface-bg-alpha', '0')
    responsiveImages.forEach((image) => {
      image.sizes = '100vw'
    })
    host.appendChild(surface.element)

    return () => {
      responsiveImages.forEach((image, index) => {
        image.sizes = previousImageSizes[index]
      })
      surface.element.dataset.lightboxSurfaceState = 'source'
      surface.element.style.removeProperty('--lightbox-phone-surface-bg-alpha')
      surface.element.style.paddingTop = previousPadding.top
      surface.element.style.paddingRight = previousPadding.right
      surface.element.style.paddingBottom = previousPadding.bottom
      surface.element.style.paddingLeft = previousPadding.left
      surface.slot.appendChild(surface.element)
      surface.slot.style.height = previousSlotHeight
    }
  }, [surface])

  return <div ref={hostRef} className="flex h-full w-full items-center justify-center" />
}

function ModuleSlide({
  slide,
  active,
  sourceRect,
  sourceAspectRatio,
  movableSurface,
}: {
  slide: ModuleLightboxSlide
  active: boolean
  sourceRect?: LightboxRect
  sourceAspectRatio?: number
  movableSurface?: MovableModuleSurface
}) {
  const Component = mediaBlockComponents[slide.block?.blockType]

  if (!Component) return null

  const blockType = slide.block?.blockType
  const isFramed = framedBlockTypes.includes(blockType)
  const intrinsicFrameAspectRatio = INTRINSIC_LIGHTBOX_ASPECT_RATIOS[blockType]
  const contentAspectRatio = getLightboxDisplayAspectRatio(slide, sourceAspectRatio)
  const displayAspectRatio = intrinsicFrameAspectRatio
    ? getPaddedSurfaceAspectRatio(intrinsicFrameAspectRatio, movableSurface)
    : contentAspectRatio
  const component = movableSurface ? (
    <MovableModuleSurfaceMount surface={movableSurface} />
  ) : (
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

  if (movableSurface) {
    const surfaceStyle = sourceRect
      ? {
        height: `${sourceRect.height}px`,
        transform: `scale(${getLightboxScaleForSourceRect(sourceRect)})`,
        transformOrigin: 'center',
        width: `${sourceRect.width}px`,
      }
      : displayAspectRatio
      ? {
        aspectRatio: displayAspectRatio,
        width: `min(calc(100dvw - 48px), calc((100dvh - 96px) * ${displayAspectRatio}))`,
      }
      : { width: 'calc(100dvw - 48px)', height: 'calc(100dvh - 96px)' }

    return (
      <div
        className="mx-auto flex"
        style={surfaceStyle}
      >
        {component}
      </div>
    )
  }

  if (intrinsicFrameAspectRatio && !sourceAspectRatio) {
    return (
      <div
        className="mx-auto flex items-center justify-center"
        style={{
          aspectRatio: intrinsicFrameAspectRatio,
          width: `min(calc(100dvw - 32px), calc((100dvh - 72px) * ${intrinsicFrameAspectRatio}))`,
        }}
      >
        {component}
      </div>
    )
  }

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
          slide.block?.blockType === 'dc1' ? 'bg-background-alt' : 'tablet:bg-background-alt',
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

function ZoomablePhotoModuleSlide({
  slide,
  photoZoomTargetRef,
  photoZoomX,
  photoZoomY,
  photoZoomScale,
}: {
  slide: ModuleLightboxSlide
  photoZoomTargetRef: RefObject<HTMLDivElement | null>
  photoZoomX: ReturnType<typeof useMotionValue<number>>
  photoZoomY: ReturnType<typeof useMotionValue<number>>
  photoZoomScale: ReturnType<typeof useMotionValue<number>>
}) {
  const image = slide.block?.image
  if (!image?.url) return null

  const aspectRatio = getPhotoAspectRatio(slide)
  const objectFit = slide.block?.fit === 'cover' ? 'object-cover' : 'object-contain'

  return (
    <motion.div
      ref={photoZoomTargetRef}
      data-lightbox-photo-zoom-target
      data-module-image-root
      className="mx-auto w-full"
      style={{
        scale: photoZoomScale,
        transformOrigin: 'center center',
        willChange: 'transform',
        width: getConstrainedPhotoLightboxWidth(aspectRatio),
        x: photoZoomX,
        y: photoZoomY,
      }}
    >
      <div
        data-module-image-frame
        className="relative w-full overflow-hidden"
      >
        <div
          data-module-image-content
          className="relative w-full"
          style={{ aspectRatio }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={image.url}
              alt={image.alt || ''}
              fill
              className={objectFit}
              sizes="100vw"
              quality={90}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
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
  movableSurface,
  activeSlideIsFramed,
  activeSlideUsesMeasuredAspect,
  activeSlideTransition,
  photoZoomEnabled,
  photoZoomed,
  photoZoomTargetRef,
  photoZoomX,
  photoZoomY,
  photoZoomScale,
  onSourceReady,
  onSourceReveal,
  ownsDrag,
  swipeOffset,
  dragX,
  dragY,
  dragScale,
  handlePointerDown,
  handlePointerMove,
  handlePointerEnd,
  handleMouseDown,
  handlePhotoPointerDown,
  handlePhotoPointerMove,
  handlePhotoPointerEnd,
  handlePhotoMouseDown,
  handlePhotoDoubleClick,
  handlePhotoClick,
}: {
  slide: ModuleLightboxSlide
  direction: number
  transitionMode: TransitionMode
  closing: boolean
  prefersReducedMotion: boolean | null
  entrySourceRect?: LightboxRect
  exitSourceRect?: LightboxRect
  sourceAspectRatio?: number
  movableSurface?: MovableModuleSurface
  activeSlideIsFramed: boolean
  activeSlideUsesMeasuredAspect: boolean
  activeSlideTransition: Transition
  photoZoomEnabled: boolean
  photoZoomed: boolean
  photoZoomTargetRef: RefObject<HTMLDivElement | null>
  photoZoomX: ReturnType<typeof useMotionValue<number>>
  photoZoomY: ReturnType<typeof useMotionValue<number>>
  photoZoomScale: ReturnType<typeof useMotionValue<number>>
  onSourceReady: (id: string) => void
  onSourceReveal: (id: string) => void
  ownsDrag: boolean
  swipeOffset: number
  dragX: ReturnType<typeof useMotionValue<number>>
  dragY: ReturnType<typeof useMotionValue<number>>
  dragScale: ReturnType<typeof useTransform<number, number>>
  handlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handlePointerEnd: (event: PointerEvent<HTMLDivElement>) => void
  handleMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  handlePhotoPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  handlePhotoPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  handlePhotoPointerEnd: (event: PointerEvent<HTMLDivElement>) => void
  handlePhotoMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void
  handlePhotoDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void
  handlePhotoClick: (event: ReactMouseEvent<HTMLDivElement>) => void
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
      const initialTransform = getFlipCssTransform(
        entrySourceRect,
        nextTransformRect,
        nextContentRect,
        activeSlideIsFramed,
      )
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
  }, [activeSlideIsFramed, entrySourceRect, onSourceReady, prefersReducedMotion, slide.id, transitionMode])

  useLayoutEffect(() => {
    const zoomElement = zoomRef.current

    exitAnimationRef.current?.cancel()
    exitAnimationRef.current = null

    if (
      !closing
      || transitionMode !== 'zoom'
      || prefersReducedMotion
      || !exitSourceRect
      || !zoomElement
      || typeof zoomElement.animate !== 'function'
    ) return

    const slotElement = slotRef.current
    const targetElement = targetRef.current
    const nextSlotRect = getElementRect(slotElement)
    const nextTargetRect = getElementRect(targetElement)
    const nextZoomRect = getElementRect(zoomElement)
    const nextContentRect = getRenderedContentRect(contentRef.current)
    if (!slotElement || !targetElement || !nextSlotRect || !nextTargetRect || !nextZoomRect || !nextContentRect) return

    // The drag transform is resetting while the return animation runs. Measure
    // the content once, then remove that temporary scale from the FLIP geometry
    // so both compositor animations converge on the same source rectangle.
    const renderedTargetScale = targetElement.offsetWidth > 0
      ? nextTargetRect.width / targetElement.offsetWidth
      : 1
    const baseTargetLeft = nextSlotRect.left + targetElement.offsetLeft
    const baseTargetTop = nextSlotRect.top + targetElement.offsetTop
    const toUntransformedRect = (rect: LightboxRect): LightboxRect => ({
      left: baseTargetLeft + (rect.left - nextTargetRect.left) / renderedTargetScale,
      top: baseTargetTop + (rect.top - nextTargetRect.top) / renderedTargetScale,
      width: rect.width / renderedTargetScale,
      height: rect.height / renderedTargetScale,
    })
    const baseZoomRect = toUntransformedRect(nextZoomRect)
    const baseContentRect = toUntransformedRect(nextContentRect)

    const finalTransform = getFlipCssTransform(
      exitSourceRect,
      baseZoomRect,
      baseContentRect,
      activeSlideIsFramed,
    )
    const animation = zoomElement.animate([
      { transform: 'translate3d(0px, 0px, 0px) scale(1, 1)', opacity: 1 },
      { transform: finalTransform, opacity: 1 },
    ], ZOOM_ENTRY_TIMING)
    const revealTimer = window.setTimeout(
      () => onSourceReveal(slide.id),
      ZOOM_DURATION_MS * SOURCE_REVEAL_PROGRESS,
    )

    exitAnimationRef.current = animation
    animation.onfinish = () => {
      if (exitAnimationRef.current === animation) exitAnimationRef.current = null
    }
    animation.oncancel = () => {
      if (exitAnimationRef.current === animation) exitAnimationRef.current = null
    }

    return () => {
      window.clearTimeout(revealTimer)
      if (exitAnimationRef.current === animation) exitAnimationRef.current = null
      animation.cancel()
    }
  }, [activeSlideIsFramed, closing, exitSourceRect, onSourceReveal, prefersReducedMotion, slide.id, transitionMode])

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
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
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
          movableSurface
            ? 'w-full'
            : activeSlideIsFramed
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
            className={cn(
              'cursor-grab touch-none active:cursor-grabbing',
              photoZoomEnabled && photoZoomed ? 'cursor-move active:cursor-move' : '',
            )}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={photoZoomEnabled ? handlePhotoPointerDown : handlePointerDown}
            onPointerMove={photoZoomEnabled ? handlePhotoPointerMove : handlePointerMove}
            onPointerUp={photoZoomEnabled ? handlePhotoPointerEnd : handlePointerEnd}
            onPointerCancel={photoZoomEnabled ? handlePhotoPointerEnd : handlePointerEnd}
            onMouseDown={photoZoomEnabled ? handlePhotoMouseDown : handleMouseDown}
            onDoubleClick={photoZoomEnabled ? handlePhotoDoubleClick : undefined}
            onDragStartCapture={(event) => event.preventDefault()}
            onClick={photoZoomEnabled ? handlePhotoClick : (event) => event.stopPropagation()}
          >
            {photoZoomEnabled ? (
              <ZoomablePhotoModuleSlide
                slide={slide}
                photoZoomTargetRef={photoZoomTargetRef}
                photoZoomX={photoZoomX}
                photoZoomY={photoZoomY}
                photoZoomScale={photoZoomScale}
              />
            ) : (
              <ModuleSlide
                slide={slide}
                active
                sourceRect={entrySourceRect || exitSourceRect}
                sourceAspectRatio={sourceAspectRatio}
                movableSurface={movableSurface}
              />
            )}
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
  getMovableSurface,
  onSourceReady,
  onClosing,
  onSourceReveal,
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
  const photoZoomX = useMotionValue(0)
  const photoZoomY = useMotionValue(0)
  const photoZoomScale = useMotionValue(1)
  const dragState = useRef<DragState | null>(null)
  const photoZoomTargetRef = useRef<HTMLDivElement | null>(null)
  const photoPointersRef = useRef(new Map<number, PhotoPointerPosition>())
  const photoGestureRef = useRef<PhotoGestureState | null>(null)
  const photoTapCandidateRef = useRef<PhotoTapCandidate | null>(null)
  const photoLastTapRef = useRef<PhotoLastTap | null>(null)
  const suppressLightboxClickUntilRef = useRef(0)
  const sourceHiddenForDragRef = useRef(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [entrySourceRect, setEntrySourceRect] = useState<LightboxRect | undefined>(initialSourceRect)
  const [exitSourceRect, setExitSourceRect] = useState<LightboxRect | undefined>()
  const [dragOwnerId, setDragOwnerId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [infoPopoverOpen, setInfoPopoverOpen] = useState(false)
  const [photoZoomed, setPhotoZoomed] = useState(false)
  const dragScale = useTransform(dragY, [0, 240], [1, 0.88])
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.36])
  const open = index >= 0
  const activeSlide = open ? slides[index] : null
  const renderedSlide = activeSlide || closingSlide
  const activeSlideIsZoomablePhoto = isZoomablePhotoSlide(activeSlide)
  const lightboxMounted = open || isClosing
  const renderedSlideIsFramed = renderedSlide
    ? framedBlockTypes.includes(renderedSlide.block?.blockType)
    : false
  const renderedSlideUsesMeasuredAspect = Boolean(renderedSlide?.preserveAspectDuringZoom)
  const renderedSlideSourceAspectRatio = renderedSlide
    ? getSourceAspectRatio(renderedSlide.id)
    : undefined
  const renderedMovableSurface = renderedSlide?.movableSurface
    ? getMovableSurface(renderedSlide.id)
    : undefined
  const renderedSlideIsZoomablePhoto = isZoomablePhotoSlide(renderedSlide)
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

  useEffect(() => {
    setInfoPopoverOpen(false)
  }, [activeSlide?.id])

  useEffect(() => {
    photoPointersRef.current.clear()
    photoGestureRef.current = null
    photoTapCandidateRef.current = null
    photoLastTapRef.current = null
    photoZoomX.set(0)
    photoZoomY.set(0)
    photoZoomScale.set(1)
    setPhotoZoomed(false)
  }, [activeSlide?.id, photoZoomScale, photoZoomX, photoZoomY])

  const setActivePhoneSurfaceBackgroundProgress = useCallback((progress: number) => {
    if (!activeSlide?.movableSurface) return

    const surface = getMovableSurface(activeSlide.id)
    const element = surface?.element
    if (!element?.querySelector('[id^="iphone"]')) return

    const visibleAlpha = Number.parseFloat(
      getComputedStyle(element).getPropertyValue('--lightbox-phone-surface-bg-alpha-visible'),
    ) || 0
    const alpha = Math.min(1, Math.max(0, progress)) * visibleAlpha
    element.style.setProperty('--lightbox-phone-surface-bg-alpha', alpha.toFixed(4))
  }, [activeSlide, getMovableSurface])

  const getCurrentPhotoZoom = useCallback((): PhotoZoomValues => ({
    x: photoZoomX.get(),
    y: photoZoomY.get(),
    scale: photoZoomScale.get(),
  }), [photoZoomScale, photoZoomX, photoZoomY])

  const suppressSyntheticPhotoClick = useCallback(() => {
    suppressLightboxClickUntilRef.current = performance.now() + PHOTO_SYNTHETIC_CLICK_SUPPRESS_MS
  }, [])

  const getClampedPhotoZoomValues = useCallback((values: PhotoZoomValues): PhotoZoomValues => {
    const target = photoZoomTargetRef.current
    if (!target || typeof window === 'undefined') {
      return {
        x: values.scale <= 1 + PHOTO_ZOOM_EPSILON ? 0 : values.x,
        y: values.scale <= 1 + PHOTO_ZOOM_EPSILON ? 0 : values.y,
        scale: Math.max(1, values.scale),
      }
    }

    const baseWidth = target.offsetWidth
    const baseHeight = target.offsetHeight
    if (baseWidth <= 0 || baseHeight <= 0) {
      return { x: 0, y: 0, scale: 1 }
    }

    const fillScale = Math.max(window.innerWidth / baseWidth, window.innerHeight / baseHeight)
    const scale = clamp(values.scale, 1, Math.max(PHOTO_MAX_SCALE, fillScale))
    if (scale <= 1 + PHOTO_ZOOM_EPSILON) return { x: 0, y: 0, scale: 1 }

    const maxX = Math.max(0, (baseWidth * scale - window.innerWidth) / 2)
    const maxY = Math.max(0, (baseHeight * scale - window.innerHeight) / 2)

    return {
      x: maxX > 0 ? clamp(values.x, -maxX, maxX) : 0,
      y: maxY > 0 ? clamp(values.y, -maxY, maxY) : 0,
      scale,
    }
  }, [])

  const applyPhotoZoomValues = useCallback((
    values: PhotoZoomValues,
    { animated = false }: { animated?: boolean } = {},
  ) => {
    const nextValues = getClampedPhotoZoomValues(values)
    const isZoomed = nextValues.scale > 1 + PHOTO_ZOOM_EPSILON

    if (animated && !prefersReducedMotion) {
      animate(photoZoomX, nextValues.x, ZOOM_TRANSITION)
      animate(photoZoomY, nextValues.y, ZOOM_TRANSITION)
      animate(photoZoomScale, nextValues.scale, ZOOM_TRANSITION)
    } else {
      photoZoomX.set(nextValues.x)
      photoZoomY.set(nextValues.y)
      photoZoomScale.set(nextValues.scale)
    }

    setPhotoZoomed(isZoomed)
  }, [getClampedPhotoZoomValues, photoZoomScale, photoZoomX, photoZoomY, prefersReducedMotion])

  const resetPhotoZoom = useCallback((animated = false) => {
    applyPhotoZoomValues({ x: 0, y: 0, scale: 1 }, { animated })
  }, [applyPhotoZoomValues])

  const cancelLightboxDragForPhotoGesture = useCallback(() => {
    if (sourceHiddenForDragRef.current) {
      sourceHiddenForDragRef.current = false
      if (activeSlide) onReturnCancelled(activeSlide.id)
    }

    dragState.current = null
    setActivePhoneSurfaceBackgroundProgress(0)
    dragX.set(0)
    dragY.set(0)
  }, [activeSlide, dragX, dragY, onReturnCancelled, setActivePhoneSurfaceBackgroundProgress])

  const getAnchoredPhotoZoomValues = useCallback((
    point: { x: number; y: number },
    targetScale: number,
    startValues: PhotoZoomValues = getCurrentPhotoZoom(),
  ): PhotoZoomValues => {
    if (typeof window === 'undefined') return { x: 0, y: 0, scale: targetScale }

    const viewportCenterX = window.innerWidth / 2
    const viewportCenterY = window.innerHeight / 2
    const safeStartScale = Math.max(1, startValues.scale)
    const scaleRatio = targetScale / safeStartScale
    const anchorX = point.x - viewportCenterX - startValues.x
    const anchorY = point.y - viewportCenterY - startValues.y

    return {
      x: point.x - viewportCenterX - anchorX * scaleRatio,
      y: point.y - viewportCenterY - anchorY * scaleRatio,
      scale: targetScale,
    }
  }, [getCurrentPhotoZoom])

  const getPhotoCoverScale = useCallback(() => {
    const target = photoZoomTargetRef.current
    if (!target || typeof window === 'undefined' || target.offsetWidth <= 0 || target.offsetHeight <= 0) {
      return 2
    }

    const coverScale = Math.max(window.innerWidth / target.offsetWidth, window.innerHeight / target.offsetHeight)
    return coverScale > 1 + PHOTO_ZOOM_EPSILON ? coverScale : 2
  }, [])

  const togglePhotoZoomAtPoint = useCallback((point: { x: number; y: number }) => {
    suppressSyntheticPhotoClick()
    const currentZoom = getCurrentPhotoZoom()

    if (currentZoom.scale > 1 + PHOTO_ZOOM_EPSILON) {
      resetPhotoZoom(true)
      return
    }

    const targetScale = getPhotoCoverScale()
    applyPhotoZoomValues(
      getAnchoredPhotoZoomValues(point, targetScale, currentZoom),
      { animated: true },
    )
  }, [
    applyPhotoZoomValues,
    getAnchoredPhotoZoomValues,
    getCurrentPhotoZoom,
    getPhotoCoverScale,
    resetPhotoZoom,
    suppressSyntheticPhotoClick,
  ])

  const settlePhotoZoom = useCallback((animated = true) => {
    const currentZoom = getCurrentPhotoZoom()
    if (currentZoom.scale <= 1 + PHOTO_ZOOM_EPSILON) {
      resetPhotoZoom(animated)
      return
    }

    applyPhotoZoomValues(currentZoom, { animated })
  }, [applyPhotoZoomValues, getCurrentPhotoZoom, resetPhotoZoom])

  const resetDrag = useCallback(() => {
    if (sourceHiddenForDragRef.current) {
      sourceHiddenForDragRef.current = false
      if (activeSlide) onReturnCancelled(activeSlide.id)
    }
    setActivePhoneSurfaceBackgroundProgress(0)
    animate(dragX, 0, ZOOM_TRANSITION)
    animate(dragY, 0, ZOOM_TRANSITION)
  }, [activeSlide, dragX, dragY, onReturnCancelled, setActivePhoneSurfaceBackgroundProgress])

  const close = useCallback((mode: TransitionMode = 'zoom') => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    dragState.current = null
    photoPointersRef.current.clear()
    photoGestureRef.current = null
    resetPhotoZoom(false)
    setInfoPopoverOpen(false)

    const nextSourceRect = mode === 'zoom' && activeSlide
      ? getSourceRect(activeSlide.id)
      : undefined
    flushSync(() => {
      if (mode === 'zoom' && activeSlide && nextSourceRect) {
        onClosing(activeSlide.id)
      }
      if (mode === 'zoom') setActivePhoneSurfaceBackgroundProgress(1)
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
      setActivePhoneSurfaceBackgroundProgress(0)
      onClosed()
    }, prefersReducedMotion ? 220 : 560)
  }, [activeSlide, dragX, dragY, getSourceRect, onClosed, onClosing, prefersReducedMotion, resetPhotoZoom, setActivePhoneSurfaceBackgroundProgress])

  const navigate = useCallback((increment: number) => {
    setInfoPopoverOpen(false)
    photoPointersRef.current.clear()
    photoGestureRef.current = null
    resetPhotoZoom(false)

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
  }, [activeSlide?.id, dragOwnerId, dragX, dragY, index, onClosing, resetDrag, resetPhotoZoom, slides])

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
    if (target instanceof Element && target.closest('button,a,input,textarea,select,summary')) return

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
      setActivePhoneSurfaceBackgroundProgress(offsetY / 120)
    }
  }, [activeSlide, dragX, dragY, onClosing, setActivePhoneSurfaceBackgroundProgress])

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
    if (target instanceof Element && target.closest('button,a,input,textarea,select,summary')) return
    if (!(target instanceof Element && target.closest('video'))) event.preventDefault()

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
        setActivePhoneSurfaceBackgroundProgress(offsetY / 120)
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
  }, [activeSlide, completeDrag, dragX, dragY, onClosing, setActivePhoneSurfaceBackgroundProgress])

  const startPhotoPinchGesture = useCallback((element: HTMLDivElement) => {
    const points = Array.from(photoPointersRef.current.values())
    if (points.length < 2) return false

    const first = points[0]
    const second = points[1]
    const startDistance = getDistance(first, second)
    if (startDistance <= 0) return false

    const center = getCenter(first, second)
    const currentZoom = getCurrentPhotoZoom()

    cancelLightboxDragForPhotoGesture()
    suppressSyntheticPhotoClick()
    photoTapCandidateRef.current = null
    photoGestureRef.current = {
      mode: 'pinch',
      pointerIds: [first.pointerId, second.pointerId],
      startDistance,
      startPanX: currentZoom.x,
      startPanY: currentZoom.y,
      startScale: currentZoom.scale,
    }

    for (const point of [first, second]) {
      try {
        element.setPointerCapture(point.pointerId)
      } catch {
        // The pointer may already have ended before the second contact is processed.
      }
    }

    return true
  }, [cancelLightboxDragForPhotoGesture, getCurrentPhotoZoom, suppressSyntheticPhotoClick])

  const handlePhotoTap = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return

    const candidate = photoTapCandidateRef.current
    const slideId = activeSlide?.id
    if (!candidate || !slideId || candidate.pointerId !== event.pointerId || candidate.moved) return

    const now = performance.now()
    const lastTap = photoLastTapRef.current
    const endPoint = { x: event.clientX, y: event.clientY }
    if (now - candidate.startTime > PHOTO_TAP_MAX_DURATION_MS) return

    if (
      lastTap
      && lastTap.slideId === slideId
      && now - lastTap.time <= PHOTO_DOUBLE_TAP_DELAY_MS
      && Math.hypot(endPoint.x - lastTap.x, endPoint.y - lastTap.y) <= PHOTO_DOUBLE_TAP_DISTANCE
    ) {
      event.preventDefault()
      event.stopPropagation()
      photoLastTapRef.current = null
      togglePhotoZoomAtPoint(endPoint)
      return
    }

    photoLastTapRef.current = {
      slideId,
      time: now,
      x: endPoint.x,
      y: endPoint.y,
    }
  }, [activeSlide?.id, togglePhotoZoomAtPoint])

  const handlePhotoPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!activeSlideIsZoomablePhoto) {
      handlePointerDown(event)
      return
    }

    if (event.pointerType === 'mouse' && event.button !== 0) return

    const target = event.target
    if (target instanceof Element && target.closest('button,a,input,textarea,select,summary')) return

    photoPointersRef.current.set(event.pointerId, {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    })
    photoTapCandidateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      moved: false,
    }

    if (photoPointersRef.current.size >= 2 && startPhotoPinchGesture(event.currentTarget)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const currentZoom = getCurrentPhotoZoom()
    if (currentZoom.scale > 1 + PHOTO_ZOOM_EPSILON) {
      event.preventDefault()
      event.stopPropagation()
      cancelLightboxDragForPhotoGesture()

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Some browsers can reject capture for synthetic or already-ended pointers.
      }

      photoGestureRef.current = {
        mode: 'pan',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: currentZoom.x,
        startPanY: currentZoom.y,
        startScale: currentZoom.scale,
        moved: false,
      }
      return
    }

    handlePointerDown(event)
  }, [
    activeSlideIsZoomablePhoto,
    cancelLightboxDragForPhotoGesture,
    getCurrentPhotoZoom,
    handlePointerDown,
    startPhotoPinchGesture,
  ])

  const handlePhotoPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!activeSlideIsZoomablePhoto) {
      handlePointerMove(event)
      return
    }

    const existingPoint = photoPointersRef.current.get(event.pointerId)
    if (existingPoint) {
      existingPoint.x = event.clientX
      existingPoint.y = event.clientY
    }

    const candidate = photoTapCandidateRef.current
    if (
      candidate
      && candidate.pointerId === event.pointerId
      && Math.hypot(event.clientX - candidate.startX, event.clientY - candidate.startY) > PHOTO_TAP_MOVE_TOLERANCE
    ) {
      candidate.moved = true
    }

    if (!photoGestureRef.current && photoPointersRef.current.size >= 2 && startPhotoPinchGesture(event.currentTarget)) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const gesture = photoGestureRef.current
    if (gesture?.mode === 'pinch' && gesture.pointerIds.includes(event.pointerId)) {
      const first = photoPointersRef.current.get(gesture.pointerIds[0])
      const second = photoPointersRef.current.get(gesture.pointerIds[1])
      if (!first || !second) return

      event.preventDefault()
      event.stopPropagation()
      suppressSyntheticPhotoClick()

      const nextDistance = getDistance(first, second)
      const nextCenter = getCenter(first, second)
      const targetScale = gesture.startScale * (nextDistance / gesture.startDistance)
      const nextValues = getAnchoredPhotoZoomValues(
        nextCenter,
        targetScale,
        {
          x: gesture.startPanX,
          y: gesture.startPanY,
          scale: gesture.startScale,
        },
      )

      applyPhotoZoomValues(nextValues)
      return
    }

    if (gesture?.mode === 'pan' && gesture.pointerId === event.pointerId) {
      const offsetX = event.clientX - gesture.startX
      const offsetY = event.clientY - gesture.startY
      if (Math.hypot(offsetX, offsetY) > 4) gesture.moved = true

      event.preventDefault()
      event.stopPropagation()
      applyPhotoZoomValues({
        x: gesture.startPanX + offsetX,
        y: gesture.startPanY + offsetY,
        scale: gesture.startScale,
      })
      return
    }

    if (getCurrentPhotoZoom().scale > 1 + PHOTO_ZOOM_EPSILON) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    handlePointerMove(event)
  }, [
    activeSlideIsZoomablePhoto,
    applyPhotoZoomValues,
    getAnchoredPhotoZoomValues,
    getCurrentPhotoZoom,
    handlePointerMove,
    startPhotoPinchGesture,
    suppressSyntheticPhotoClick,
  ])

  const handlePhotoPointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!activeSlideIsZoomablePhoto) {
      handlePointerEnd(event)
      return
    }

    const gesture = photoGestureRef.current
    const candidate = photoTapCandidateRef.current
    const isCancel = event.type === 'pointercancel'
    const ownsGesture = gesture
      ? gesture.mode === 'pinch'
        ? gesture.pointerIds.includes(event.pointerId)
        : gesture.pointerId === event.pointerId
      : false

    if (ownsGesture) {
      event.preventDefault()
      event.stopPropagation()

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        // Capture can already be gone after cancellation.
      }

      photoPointersRef.current.delete(event.pointerId)

      if (gesture?.mode === 'pinch') {
        suppressSyntheticPhotoClick()
        const remainingPointers = Array.from(photoPointersRef.current.values())
        const currentZoom = getCurrentPhotoZoom()

        if (remainingPointers.length === 1 && currentZoom.scale > 1 + PHOTO_ZOOM_EPSILON) {
          const remaining = remainingPointers[0]
          photoGestureRef.current = {
            mode: 'pan',
            pointerId: remaining.pointerId,
            startX: remaining.x,
            startY: remaining.y,
            startPanX: currentZoom.x,
            startPanY: currentZoom.y,
            startScale: currentZoom.scale,
            moved: false,
          }
        } else {
          photoGestureRef.current = null
          settlePhotoZoom(true)
        }

        photoTapCandidateRef.current = null
        return
      }

      photoGestureRef.current = null
      settlePhotoZoom(true)

      if (!isCancel && candidate && candidate.pointerId === event.pointerId && !candidate.moved && !gesture?.moved) {
        handlePhotoTap(event)
      }
      photoTapCandidateRef.current = null
      return
    }

    handlePointerEnd(event)
    photoPointersRef.current.delete(event.pointerId)

    if (!isCancel && candidate && candidate.pointerId === event.pointerId && !candidate.moved) {
      handlePhotoTap(event)
    }
    photoTapCandidateRef.current = null
  }, [
    activeSlideIsZoomablePhoto,
    getCurrentPhotoZoom,
    handlePhotoTap,
    handlePointerEnd,
    settlePhotoZoom,
    suppressSyntheticPhotoClick,
  ])

  const handlePhotoMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!activeSlideIsZoomablePhoto) {
      handleMouseDown(event)
      return
    }

    if (getCurrentPhotoZoom().scale > 1 + PHOTO_ZOOM_EPSILON || photoGestureRef.current) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    handleMouseDown(event)
  }, [activeSlideIsZoomablePhoto, getCurrentPhotoZoom, handleMouseDown])

  const handlePhotoDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!activeSlideIsZoomablePhoto) return

    event.preventDefault()
    event.stopPropagation()
    photoTapCandidateRef.current = null
    photoLastTapRef.current = null
    togglePhotoZoomAtPoint({ x: event.clientX, y: event.clientY })
  }, [activeSlideIsZoomablePhoto, togglePhotoZoomAtPoint])

  const handlePhotoClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (performance.now() < suppressLightboxClickUntilRef.current) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    event.stopPropagation()
  }, [])

  useEffect(() => {
    if (!lightboxMounted) return

    const originalOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (infoPopoverOpen) {
          setInfoPopoverOpen(false)
          return
        }
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
  }, [close, infoPopoverOpen, lightboxMounted, navigate])

  const lightbox = lightboxMounted ? (
    <div
      className={cn(
        'fixed inset-0 z-[100010] overflow-hidden text-black dark:text-white',
        open ? '' : 'pointer-events-none',
      )}
      onClick={(event) => {
        if (performance.now() < suppressLightboxClickUntilRef.current) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        if (!open) return
        if (infoPopoverOpen) {
          setInfoPopoverOpen(false)
          return
        }
        close()
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
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-3 tablet:p-5 desktop:p-10">
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
                className="absolute left-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors hover:bg-hover tablet:flex desktop:left-10"
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
                className="absolute right-3 top-1/2 z-20 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors hover:bg-hover tablet:flex desktop:right-10"
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
            <div className="pointer-events-none absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 tablet:bottom-6">
              <div className="pointer-events-auto text-black dark:text-white">
                <ModuleLikeButton targetId={activeSlide.likeTargetId} />
              </div>
            </div>
          )}

          <PhotoLightboxMeta
            info={activeSlide.photoInfo}
            infoOpen={infoPopoverOpen}
            prefersReducedMotion={prefersReducedMotion}
            onToggleInfo={() => setInfoPopoverOpen((value) => !value)}
            onCloseInfo={() => setInfoPopoverOpen(false)}
          />
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
              movableSurface={renderedMovableSurface}
              activeSlideIsFramed={renderedSlideIsFramed}
              activeSlideUsesMeasuredAspect={renderedSlideUsesMeasuredAspect}
              activeSlideTransition={activeSlideTransition}
              photoZoomEnabled={renderedSlideIsZoomablePhoto}
              photoZoomed={photoZoomed}
              photoZoomTargetRef={photoZoomTargetRef}
              photoZoomX={photoZoomX}
              photoZoomY={photoZoomY}
              photoZoomScale={photoZoomScale}
              onSourceReady={onSourceReady}
              onSourceReveal={onSourceReveal}
              ownsDrag={renderedSlide.id === dragOwnerId}
              swipeOffset={swipeOffset}
              dragX={dragX}
              dragY={dragY}
              dragScale={dragScale}
              handlePointerDown={handlePointerDown}
              handlePointerMove={handlePointerMove}
              handlePointerEnd={handlePointerEnd}
              handleMouseDown={handleMouseDown}
              handlePhotoPointerDown={handlePhotoPointerDown}
              handlePhotoPointerMove={handlePhotoPointerMove}
              handlePhotoPointerEnd={handlePhotoPointerEnd}
              handlePhotoMouseDown={handlePhotoMouseDown}
              handlePhotoDoubleClick={handlePhotoDoubleClick}
              handlePhotoClick={handlePhotoClick}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  ) : null

  if (!mounted) return null

  return createPortal(lightbox, document.body)
}

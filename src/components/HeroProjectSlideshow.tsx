'use client'

import Link from 'next/link'
import {
  type MotionStyle,
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Testimonial } from '@/components/Testimonial'
import { ServicePill } from '@/components/ServicePill'
import { PayloadImage } from '@/components/PayloadImage'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'
import { observeMobileHeroViewport } from '@/lib/observeMobileHeroViewport'

type HeroTestimonial = {
  id: string
  quote: string
  name: string
}

type HeroProjectSlide = {
  id: string
  title: string
  slug: string
  subtitle?: string
  pills?: string[]
  gradientColor?: string
  featuredImage?: ResponsiveImageMedia
  testimonial?: HeroTestimonial
}

type Props = {
  projects: HeroProjectSlide[]
}

const AUTOPLAY_DELAY_MS = 6000
const CURSOR_IDLE_ROTATION_SPEED = 14
const MOBILE_SLIDE_HEIGHT = 'var(--hero-mobile-height, 100dvh)'
const MOBILE_VIEWPORT_HEIGHT = 'var(--hero-mobile-viewport-height, 100dvh)'
const MOBILE_BROWSER_INSET = `max(0px, ${MOBILE_SLIDE_HEIGHT} - ${MOBILE_VIEWPORT_HEIGHT})`
const MOBILE_CONTENT_BOTTOM = `calc(1.25rem + ${MOBILE_BROWSER_INSET})`
const MOBILE_HERO_MEDIA_OVERRIDES: Record<string, ResponsiveImageMedia> = {
  dex: {
    url: '/hero/dex.webp',
    width: 3000,
    height: 1687,
    mimeType: 'image/webp',
  },
  twinsi: {
    url: '/hero/twinsi.webp',
    width: 3000,
    height: 1687,
    mimeType: 'image/webp',
  },
}
// Smoothstep alpha stops: a gentle fade with flat tangents at both ends.
const MOBILE_IMAGE_MASK = 'linear-gradient(to bottom, #000 60%, rgb(0 0 0 / .972) 64%, rgb(0 0 0 / .896) 68%, rgb(0 0 0 / .784) 72%, rgb(0 0 0 / .648) 76%, rgb(0 0 0 / .5) 80%, rgb(0 0 0 / .352) 84%, rgb(0 0 0 / .216) 88%, rgb(0 0 0 / .104) 92%, rgb(0 0 0 / .028) 96%, transparent 100%)'

function SilentBackgroundVideo({ src, label, playing = true, onLoadedData, onError }: {
  src: string
  label: string
  playing?: boolean
  onLoadedData?: (video: HTMLVideoElement) => void
  onError?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set every mute control before attaching the source. On mobile Safari this
    // prevents a decorative video from briefly claiming the device audio session.
    video.defaultMuted = true
    video.muted = true
    video.volume = 0
    video.setAttribute('muted', '')
    video.src = src
    video.load()

    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (playing) void video.play().catch(() => {})
    else video.pause()
  }, [playing, src])

  return (
    <video
      ref={videoRef}
      aria-label={label}
      autoPlay={playing}
      loop
      muted
      playsInline
      crossOrigin={onLoadedData ? 'anonymous' : undefined}
      disablePictureInPicture
      disableRemotePlayback
      preload="metadata"
      className="size-full object-cover"
      onLoadedData={event => onLoadedData?.(event.currentTarget)}
      onError={onError}
      onVolumeChange={(event) => {
        event.currentTarget.defaultMuted = true
        event.currentTarget.muted = true
        event.currentTarget.volume = 0
      }}
    />
  )
}

function samplePredominantMediaColor(image: HTMLImageElement | HTMLVideoElement) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const naturalWidth = 'videoWidth' in image ? image.videoWidth : image.naturalWidth
  const naturalHeight = 'videoHeight' in image ? image.videoHeight : image.naturalHeight
  if (!context || !naturalWidth || !naturalHeight) return null

  const sampleSize = 24
  const naturalAspect = naturalWidth / naturalHeight
  const renderedAspect = image.clientWidth && image.clientHeight
    ? image.clientWidth / image.clientHeight
    : naturalAspect
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = naturalWidth
  let sourceHeight = naturalHeight

  if (naturalAspect > renderedAspect) {
    sourceWidth = sourceHeight * renderedAspect
    sourceX = (naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = sourceWidth / renderedAspect
    sourceY = (naturalHeight - sourceHeight) / 2
  }

  canvas.width = sampleSize
  canvas.height = sampleSize
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sampleSize,
    sampleSize,
  )

  const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>()
  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue

    const red = pixels[index]
    const green = pixels[index + 1]
    const blue = pixels[index + 2]
    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 }

    bucket.count += 1
    bucket.red += red
    bucket.green += green
    bucket.blue += blue
    buckets.set(key, bucket)
  }

  const predominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0]
  if (!predominant) return null

  return [predominant.red, predominant.green, predominant.blue]
    .map((channel) => Math.round((channel / predominant.count) * 0.58))
    .join(' ')
}

function hexToRgbChannels(color?: string) {
  const match = color?.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!match) return null

  return match.slice(1).map((channel) => Number.parseInt(channel, 16)).join(' ')
}

function isVideoMedia(media?: HeroProjectSlide['featuredImage']) {
  return Boolean(
    media?.mimeType?.startsWith('video/')
    || media?.url?.match(/\.(?:mp4|mov|m4v|webm)(?:\?.*)?$/i),
  )
}

function HeroProjectPills({ pills = [] }: { pills?: string[] }) {
  if (!pills.length) return null

  return (
    <ul aria-label="Capabilities and industries" className="hero-project-pills mt-2 flex min-w-0 flex-wrap gap-2.5 max-tablet:flex-nowrap max-tablet:gap-1.5 max-tablet:overflow-x-auto">
      {pills.map(title => (
        <li key={title} className="shrink-0">
          <ServicePill title={title} size="small" variant="on-media" className="max-tablet:px-2 max-tablet:py-1 max-tablet:text-[11px]" />
        </li>
      ))}
    </ul>
  )
}

function MobileHeroSlide({
  project,
  active,
  priority,
  visualStyle,
}: {
  project: HeroProjectSlide
  active: boolean
  priority: boolean
  visualStyle?: MotionStyle
}) {
  const mediaOverride = MOBILE_HERO_MEDIA_OVERRIDES[project.slug]
  const media = mediaOverride
    ? { ...project.featuredImage, ...mediaOverride, sizes: null }
    : project.featuredImage
  const [sampledColor, setSampledColor] = useState('24 24 24')
  const [canSampleColor, setCanSampleColor] = useState(true)
  const gradientColor = hexToRgbChannels(project.gradientColor) ?? sampledColor
  const needsColorSample = canSampleColor && !hexToRgbChannels(project.gradientColor)
  const updateMediaColor = useCallback((image: HTMLImageElement | HTMLVideoElement) => {
    if (hexToRgbChannels(project.gradientColor)) return
    try {
      const color = samplePredominantMediaColor(image)
      if (color) setSampledColor(color)
    } catch {
      // Cross-origin media may not permit sampling. Keep the neutral fallback
      // rather than borrowing another slide's color; CMS overrides still work.
    }
  }, [project.gradientColor])

  return (
    // Follow the visible viewport in the slideshow, then retain that measured
    // height off-screen so browser chrome cannot move the content below it.
    <div className="hero-mobile-slide relative w-full text-text-on-media-strong" style={{ height: MOBILE_SLIDE_HEIGHT }} data-project-id={project.id}>
      {/* Snap to the actual slide's start. A one-pixel target cannot become an
          oversized snap area with intermediate stops when browser chrome changes. */}
      <div aria-hidden="true" className="hero-project-snap-point pointer-events-none absolute inset-x-0 top-0 h-px" />
      <motion.div
        className="hero-mobile-surface relative grid size-full grid-cols-1 grid-rows-[minmax(0,1fr)_auto_auto] overflow-hidden"
        style={{ ...visualStyle, backgroundColor: `rgb(${gradientColor})` }}
      >
        {/* The media shares the title's bottom grid line; text wrapping and
            editable pills determine the solid-color area without JS sizing. */}
        <div
          className="hero-mobile-media pointer-events-none relative col-start-1 row-start-1 row-end-3 min-h-0 overflow-hidden"
          style={{ maskImage: MOBILE_IMAGE_MASK, WebkitMaskImage: MOBILE_IMAGE_MASK }}
        >
          {media?.url ? (
            isVideoMedia(media) ? (
              <SilentBackgroundVideo
                key={needsColorSample ? 'sample' : 'display'}
                src={media.url}
                label={media.alt || `${project.title} project video`}
                playing={active}
                onLoadedData={needsColorSample ? updateMediaColor : undefined}
                onError={() => setCanSampleColor(false)}
              />
            ) : (
              <PayloadImage
                key={needsColorSample ? 'sample' : 'display'}
                media={media}
                alt={media.alt || ''}
                fill
                className="object-cover"
                // The image is 16:9 and object-cover crops it into a portrait
                // viewport. Describe that pre-crop width so Retina screens
                // select enough pixels for the visible height, not just 100vw.
                sizes="180vh"
                loading={priority || active ? 'eager' : undefined}
                fetchPriority={priority || active ? 'high' : undefined}
                crossOrigin={needsColorSample ? 'anonymous' : undefined}
                onLoad={(event) => updateMediaColor(event.currentTarget)}
                onError={() => setCanSampleColor(false)}
              />
            )
          ) : null}
        </div>

        <Link
          href={`/work/${project.slug}`}
          aria-label={`View ${project.title} project`}
          className="absolute inset-0 z-0"
        />

        <Link
          href={`/work/${project.slug}`}
          className="hero-mobile-caption z-10 col-start-1 row-start-2 row-end-4 ml-5 mr-24 grid grid-rows-subgrid rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <h2 className="hero-project-title text-balance">{project.title}</h2>
          <div className="hero-mobile-details flex flex-col gap-2 pt-2" style={{ paddingBottom: MOBILE_CONTENT_BOTTOM }}>
            {project.subtitle ? (
              <p className="max-w-2xl text-body text-pretty text-text-on-media-muted">{project.subtitle}</p>
            ) : null}
            <HeroProjectPills pills={project.pills} />
          </div>
        </Link>
        <Link
          href={`/work/${project.slug}`}
          aria-label={`Open ${project.title} project`}
          className="absolute right-5 z-20 flex size-10 items-center justify-center rounded-full bg-white transition-colors duration-150 hover:bg-white/90 active:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          style={{ bottom: MOBILE_CONTENT_BOTTOM }}
        >
          <svg aria-hidden="true" className="size-6 text-text-on-light" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
            <path d="M6 16h20M18 8l8 8-8 8" />
          </svg>
        </Link>
      </motion.div>
    </div>
  )
}

export function HeroProjectSlideshow({ projects }: Props) {
  const cursorTextPathId = `hero-cursor-${useId().replaceAll(':', '')}`
  const regionRef = useRef<HTMLDivElement>(null)
  const mobileViewportProbeRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(regionRef, { amount: 0.25 })
  const prefersReducedMotion = useReducedMotion()
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isMobilePaginationVisible, setIsMobilePaginationVisible] = useState(false)
  const progress = useMotionValue(0)
  const insetScale = useMotionValue(1)
  const insetRadius = useMotionValue(20)
  const expansionDistance = useMotionValue(320)
  const caseStudyCursorX = useMotionValue(0)
  const caseStudyCursorY = useMotionValue(0)
  const caseStudyCursorRotationTarget = useMotionValue(0)
  const caseStudyCursorBaseRotation = useSpring(caseStudyCursorRotationTarget, {
    stiffness: 90,
    damping: 15,
    mass: 0.8,
  })
  const caseStudyCursorSpinRotation = useMotionValue(0)
  const caseStudyCursorRotation = useTransform(() => (
    caseStudyCursorBaseRotation.get() + caseStudyCursorSpinRotation.get()
  ))
  const lastCaseStudyCursorPosition = useRef<{
    x: number
    y: number
    direction: number | null
    timestamp: number
  } | null>(null)
  const caseStudyCursorSpinVelocity = useRef(-CURSOR_IDLE_ROTATION_SPEED)
  const caseStudyCursorSpinFrame = useRef<number | null>(null)
  const caseStudyCursorSpinTimestamp = useRef<number | null>(null)
  const caseStudyCursorCircularGesture = useRef({
    direction: 0,
    turn: 0,
    lastTurnTimestamp: 0,
  })
  const [activeIndex, setActiveIndex] = useState(0)
  const [isFocusPaused, setIsFocusPaused] = useState(false)
  const [isCaseStudyCursorVisible, setIsCaseStudyCursorVisible] = useState(false)
  const [cursorPortalRoot, setCursorPortalRoot] = useState<HTMLElement | null>(null)

  const { scrollY } = useScroll()
  const expansionProgress = useTransform(() => {
    if (prefersReducedMotion) return 1
    return Math.min(1, Math.max(0, scrollY.get() / expansionDistance.get()))
  })
  const slideshowScale = useTransform(() => {
    const scrollProgress = expansionProgress.get()
    return insetScale.get() + (1 - insetScale.get()) * scrollProgress
  })
  const slideshowRadius = useTransform(() => {
    const scrollProgress = expansionProgress.get()
    return insetRadius.get() * (1 - scrollProgress)
  })

  const showNext = useCallback(() => {
    setActiveIndex((current) => (current + 1) % projects.length)
  }, [projects.length])

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => (current - 1 + projects.length) % projects.length)
  }, [projects.length])

  const scrollToMobileStep = useCallback((step: number) => {
    const region = regionRef.current
    if (!region) return

    const clampedStep = Math.max(0, Math.min(projects.length - 1, step))
    const slide = region.querySelectorAll<HTMLElement>('.hero-mobile-slide')[clampedStep]
    slide?.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [prefersReducedMotion, projects.length])

  const selectSlide = useCallback((index: number) => {
    setActiveIndex(index)

    if (isMobileViewport) {
      scrollToMobileStep(index)
    }
  }, [isMobileViewport, scrollToMobileStep])

  const stopCaseStudyCursorSpin = useCallback(() => {
    if (caseStudyCursorSpinFrame.current !== null) {
      cancelAnimationFrame(caseStudyCursorSpinFrame.current)
    }

    caseStudyCursorSpinFrame.current = null
    caseStudyCursorSpinTimestamp.current = null
    caseStudyCursorCircularGesture.current = {
      direction: 0,
      turn: 0,
      lastTurnTimestamp: 0,
    }
  }, [])

  const startCaseStudyCursorSpin = useCallback(() => {
    if (caseStudyCursorSpinFrame.current !== null || prefersReducedMotion) return

    const tick = (timestamp: number) => {
      const previousTimestamp = caseStudyCursorSpinTimestamp.current ?? timestamp
      const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.032)
      const velocity = caseStudyCursorSpinVelocity.current
      const idleVelocity = (Math.sign(velocity) || -1) * CURSOR_IDLE_ROTATION_SPEED
      const relaxation = 1 - Math.exp(-1.2 * deltaSeconds)

      caseStudyCursorSpinTimestamp.current = timestamp
      caseStudyCursorSpinRotation.set(caseStudyCursorSpinRotation.get() + velocity * deltaSeconds)
      caseStudyCursorSpinVelocity.current = velocity + (idleVelocity - velocity) * relaxation

      caseStudyCursorSpinFrame.current = requestAnimationFrame(tick)
    }

    caseStudyCursorSpinFrame.current = requestAnimationFrame(tick)
  }, [caseStudyCursorSpinRotation, prefersReducedMotion])

  const updateCaseStudyCursor = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || window.innerWidth < 810) return

    const isOverButton = Boolean((event.target as HTMLElement).closest('button'))
    const previousPosition = lastCaseStudyCursorPosition.current

    caseStudyCursorX.set(event.clientX)
    caseStudyCursorY.set(event.clientY)
    setIsCaseStudyCursorVisible(!isOverButton)

    if (isOverButton) {
      lastCaseStudyCursorPosition.current = null
      stopCaseStudyCursorSpin()
      return
    }

    startCaseStudyCursorSpin()

    if (!prefersReducedMotion && previousPosition) {
      const deltaX = event.clientX - previousPosition.x
      const deltaY = event.clientY - previousPosition.y
      const distance = Math.hypot(deltaX, deltaY)
      const elapsed = Math.max(1, event.timeStamp - previousPosition.timestamp)

      if (distance > 2 && elapsed < 100) {
        const direction = Math.atan2(deltaY, deltaX)
        const directionalDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY
        const pointerAngularVelocity = (directionalDelta / elapsed) * 1000 * 0.24

        caseStudyCursorRotationTarget.set(
          caseStudyCursorRotationTarget.get() + directionalDelta * 0.16,
        )
        caseStudyCursorSpinVelocity.current = Math.min(
          1080,
          Math.max(
            -1080,
            caseStudyCursorSpinVelocity.current * 0.3 + pointerAngularVelocity * 0.7,
          ),
        )

        if (previousPosition.direction !== null) {
          let directionChange = direction - previousPosition.direction
          if (directionChange > Math.PI) directionChange -= Math.PI * 2
          if (directionChange < -Math.PI) directionChange += Math.PI * 2

          const directionChangeDegrees = directionChange * (180 / Math.PI)
          const turnDirection = Math.sign(directionChangeDegrees)
          const absoluteTurn = Math.abs(directionChangeDegrees)
          const cursorSpeed = distance / elapsed
          const circularGesture = caseStudyCursorCircularGesture.current
          const isConsistentTurn = (
            turnDirection !== 0
            && (circularGesture.direction === 0 || circularGesture.direction === turnDirection)
            && event.timeStamp - circularGesture.lastTurnTimestamp < 160
          )
          const isDeliberateTurn = absoluteTurn >= 1.5 && absoluteTurn <= 50 && cursorSpeed >= 0.12

          if (isDeliberateTurn) {
            circularGesture.direction = turnDirection
            circularGesture.turn = isConsistentTurn
              ? Math.min(720, circularGesture.turn + absoluteTurn)
              : absoluteTurn
            circularGesture.lastTurnTimestamp = event.timeStamp

            if (circularGesture.turn >= 300) {
              const speedMultiplier = Math.min(2.25, Math.max(0.75, cursorSpeed * 2))
              const windStrength = Math.min(1.75, 0.35 + (circularGesture.turn - 300) / 240)
              const angularImpulse = directionChangeDegrees * speedMultiplier * windStrength * 0.6

              caseStudyCursorSpinVelocity.current = Math.min(
                1080,
                Math.max(-1080, caseStudyCursorSpinVelocity.current + angularImpulse),
              )
              startCaseStudyCursorSpin()
            }
          } else if (absoluteTurn > 50) {
            circularGesture.direction = 0
            circularGesture.turn = 0
            circularGesture.lastTurnTimestamp = 0
          }
        }

        lastCaseStudyCursorPosition.current = {
          x: event.clientX,
          y: event.clientY,
          direction,
          timestamp: event.timeStamp,
        }
        return
      }
    }

    lastCaseStudyCursorPosition.current = {
      x: event.clientX,
      y: event.clientY,
      direction: previousPosition?.direction ?? null,
      timestamp: event.timeStamp,
    }
  }, [caseStudyCursorRotationTarget, caseStudyCursorX, caseStudyCursorY, prefersReducedMotion, startCaseStudyCursorSpin, stopCaseStudyCursorSpin])

  const handleCaseStudyCursorLeave = useCallback(() => {
    setIsCaseStudyCursorVisible(false)
    lastCaseStudyCursorPosition.current = null
    stopCaseStudyCursorSpin()
  }, [stopCaseStudyCursorSpin])

  const isAutoplayRunning =
    projects.length > 1
    && !isMobileViewport
    && !isFocusPaused
    && isInView
    && !prefersReducedMotion

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 809px)')
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  useEffect(() => {
    if (!isMobileViewport) return
    const region = regionRef.current
    const probe = mobileViewportProbeRef.current
    if (!region || !probe) return
    return observeMobileHeroViewport(region, probe, setIsMobilePaginationVisible)
  }, [isMobileViewport, projects])

  useEffect(() => {
    if (!isMobileViewport) return
    const region = regionRef.current
    const media = region?.querySelectorAll<HTMLElement>('.hero-mobile-media')[activeIndex]
    if (!region || !media) return

    // Keep one sticky pagination control, centered on the active image rather
    // than the full slide. Observe size only; don't measure while scrolling.
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) {
        region.style.setProperty('--hero-mobile-image-height', `${entry.contentRect.height}px`)
      }
    })
    observer.observe(media)
    return () => observer.disconnect()
  }, [activeIndex, isMobileViewport, projects])

  useEffect(() => {
    if (!isMobileViewport) return
    const slides = regionRef.current?.querySelectorAll<HTMLElement>('.hero-mobile-slide')
    if (!slides) return

    // The browser moves the real slides. Observe only which slide is visible
    // so video playback and pagination don't need a second scroll calculation.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio < 0.5) continue
        const index = projects.findIndex((project) => project.id === (entry.target as HTMLElement).dataset.projectId)
        if (index >= 0) setActiveIndex(index)
      }
    }, { threshold: 0.5 })
    slides.forEach((slide) => observer.observe(slide))
    return () => observer.disconnect()
  }, [isMobileViewport, projects])

  useEffect(() => {
    if (!isMobileViewport || projects.length < 2) return

    const root = document.documentElement
    const region = regionRef.current
    if (!region) return

    const approach = document.querySelector<HTMLElement>('.hero-approach-snap-point')
    if (!approach) return

    let approachSnapY = 0
    let touchY: number | null = null
    const measureBoundary = () => {
      const margin = Number.parseFloat(getComputedStyle(approach).scrollMarginTop) || 0
      approachSnapY = approach.getBoundingClientRect().top + window.scrollY - margin
    }
    const setFreeScroll = (free: boolean) => {
      root.classList.toggle('hero-project-pagination-free', free)
    }
    const updateGestureMode = (deltaY: number) => {
      if (!deltaY) return
      const distancePastApproach = window.scrollY - approachSnapY
      setFreeScroll(distancePastApproach > 1 || (distancePastApproach >= -1 && deltaY > 0))
    }

    const handleScrollEnd = () => {
      measureBoundary()
      // Keep pagination ready at the exact boundary for the next upward swipe.
      // Downward input disables it before moving into Approach. Switching it
      // on during an upward gesture can consume that first gesture in WebKit.
      setFreeScroll(window.scrollY > approachSnapY + 1)
    }
    // Choose the mode from input direction before the browser handles the swipe.
    // Proximity snapping still catches downward swipes, so Approach uses none.
    // These listeners never move the page or cancel native scrolling.
    const handleTouchStart = (event: TouchEvent) => {
      measureBoundary()
      touchY = event.touches.length === 1 ? event.touches[0].clientY : null
    }
    const handleTouchMove = (event: TouchEvent) => {
      if (touchY === null || event.touches.length !== 1) return
      const nextY = event.touches[0].clientY
      updateGestureMode(touchY - nextY)
      touchY = nextY
    }
    const handleTouchEnd = () => { touchY = null }
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      measureBoundary()
      updateGestureMode(event.deltaY)
    }

    // Safari before 26.2 has no scrollend. This fallback only changes snap
    // strictness at Approach; it never moves the page or resizes the slides.
    let settleTimeout: ReturnType<typeof setTimeout> | undefined
    const supportsScrollEnd = 'onscrollend' in window
    const handleScroll = () => {
      // Also catch re-entry during momentum or keyboard scrolling. Use the
      // cached boundary so the scroll listener doesn't measure layout.
      if (window.scrollY < approachSnapY - 1) setFreeScroll(false)
      if (!supportsScrollEnd) {
        clearTimeout(settleTimeout)
        settleTimeout = setTimeout(handleScrollEnd, 180)
      }
    }
    root.classList.add('hero-project-pagination-active')
    handleScrollEnd()
    if (supportsScrollEnd) window.addEventListener('scrollend', handleScrollEnd)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('resize', measureBoundary, { passive: true })

    return () => {
      window.removeEventListener('scrollend', handleScrollEnd)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('resize', measureBoundary)
      clearTimeout(settleTimeout)
      root.classList.remove('hero-project-pagination-active')
      root.classList.remove('hero-project-pagination-free')
    }
  }, [isMobileViewport, projects.length])

  useEffect(() => {
    progress.set(0)
  }, [activeIndex, progress])

  useEffect(() => {
    setCursorPortalRoot(document.body)
  }, [])

  useEffect(() => stopCaseStudyCursorSpin, [stopCaseStudyCursorSpin])

  useEffect(() => {
    if (!isAutoplayRunning) return

    const currentProgress = progress.get()
    const playback = animate(progress, 1, {
      duration: Math.max(0.05, (1 - currentProgress) * (AUTOPLAY_DELAY_MS / 1000)),
      ease: 'linear',
      onComplete: showNext,
    })

    return () => playback.stop()
  }, [activeIndex, isAutoplayRunning, progress, showNext])

  useEffect(() => {
    const region = regionRef.current
    if (!region) return

    const updateInset = () => {
      const width = region.getBoundingClientRect().width
      if (!width) return

      const viewportWidth = window.innerWidth
      const gutter = viewportWidth >= 810 ? 40 : 20
      const radius = viewportWidth >= 1280 ? 40 : viewportWidth >= 810 ? 30 : 20
      const regionDocumentTop = region.getBoundingClientRect().top + window.scrollY

      insetScale.set(Math.max(0.8, (width - gutter * 2) / width))
      insetRadius.set(radius)
      expansionDistance.set(
        viewportWidth < 810
          ? Math.max(1, Math.floor(regionDocumentTop) - 8)
          : Math.max(240, window.innerHeight * 0.35),
      )
    }

    updateInset()
    const resizeObserver = new ResizeObserver(updateInset)
    resizeObserver.observe(region)
    window.addEventListener('resize', updateInset)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateInset)
    }
  }, [expansionDistance, insetRadius, insetScale])

  if (!projects.length) return null

  const activeProject = projects[activeIndex]
  const activeMedia = activeProject.featuredImage
  const activeMediaIsVideo = isVideoMedia(activeMedia)
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.6, ease: 'easeOut' as const }

  return (
    <div
      ref={regionRef}
      className="hero-project-scroll-region relative w-full"
    >
      <div ref={mobileViewportProbeRef} aria-hidden="true" className="pointer-events-none invisible fixed top-0 left-0 h-dvh w-0 tablet:hidden" />
      <div role="region" aria-label="Featured projects" aria-roledescription="carousel" className="grid tablet:hidden">
        <div className="col-start-1 row-start-1 min-w-0">
          {projects.map((project, index) => (
            <MobileHeroSlide
              key={project.id}
              project={project}
              active={isMobileViewport && index === activeIndex}
              priority={index === 0}
              visualStyle={index === 0 ? { scale: slideshowScale, borderRadius: slideshowRadius } : undefined}
            />
          ))}
        </div>
        {projects.length > 1 ? (
          // Share one viewport-height overlay without adding scroll height.
          // Sticky keeps the lines still between slides, but scoped to the hero.
          <div className="pointer-events-none sticky top-0 z-20 col-start-1 row-start-1 self-start" style={{ height: MOBILE_VIEWPORT_HEIGHT }}>
            <div
              role="group"
              aria-label="Project pagination"
              aria-hidden={!isMobilePaginationVisible}
              inert={!isMobilePaginationVisible}
              className={`hero-mobile-pagination absolute right-3 flex -translate-y-1/2 flex-col gap-1 ${isMobilePaginationVisible ? '' : 'invisible'}`}
              style={{ top: 'calc(var(--hero-mobile-image-height, 75dvh) / 2)' }}
            >
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  aria-label={`Show ${project.title}, slide ${index + 1} of ${projects.length}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => selectSlide(index)}
                  className="pointer-events-auto group inline-flex w-8 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span aria-hidden="true" className={`block h-7 w-0.5 shadow-sm transition-opacity duration-150 group-hover:opacity-75 ${index === activeIndex ? 'bg-white' : 'bg-black/35'}`} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

        <motion.section
          role="region"
          aria-label="Featured projects"
          aria-roledescription="carousel"
          className="hero-project-slideshow relative hidden w-full origin-center overflow-hidden bg-background-alt text-text-on-media-strong tablet:block tablet:aspect-video"
          style={{ scale: slideshowScale, borderRadius: slideshowRadius }}
          onPointerEnter={updateCaseStudyCursor}
          onPointerMove={updateCaseStudyCursor}
          onPointerLeave={handleCaseStudyCursorLeave}
          onFocusCapture={() => setIsFocusPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusPaused(false)
          }}
        >
      <AnimatePresence initial={false} mode="sync">
        {activeMedia?.url ? (
          <motion.div
            key={activeProject.id}
            className="absolute inset-0 hidden tablet:block"
            initial={prefersReducedMotion ? false : { opacity: 0, x: '3%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: '-3%' }}
            transition={transition}
          >
            {activeMediaIsVideo ? (
              <SilentBackgroundVideo
                src={activeMedia.url}
                label={activeMedia.alt || `${activeProject.title} project video`}
                playing={!isMobileViewport}
              />
            ) : (
              <PayloadImage
                media={activeMedia}
                alt={activeMedia.alt || ''}
                fill
                className="object-cover"
                sizes="100vw"
                priority={activeIndex === 0}
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Link
        href={`/work/${activeProject.slug}`}
        aria-label={`View ${activeProject.title} project`}
        className="absolute inset-0 z-0 hidden tablet:block"
      />

      {projects.length > 1 ? (
        <>
          <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1 tablet:left-8 tablet:right-auto tablet:top-6 tablet:translate-y-0 tablet:flex-row">
            {projects.map((project, index) => (
              <button
                key={project.id}
                type="button"
                aria-label={`Show ${project.title}, slide ${index + 1} of ${projects.length}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => selectSlide(index)}
                className="group inline-flex w-8 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white tablet:h-8 tablet:w-auto"
              >
                <span className="relative block h-7 w-0.5 overflow-hidden bg-black/35 shadow-sm transition-opacity duration-150 group-hover:opacity-75 tablet:h-0.5 tablet:w-7">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 origin-top bg-white tablet:origin-left"
                    style={isMobileViewport
                      ? { scaleY: index === activeIndex ? 1 : 0 }
                      // Focus pauses autoplay after a chevron or pagination click.
                      // Keep the selected slide visible even with zero progress.
                      : { scaleX: index === activeIndex ? (isAutoplayRunning ? progress : 1) : 0 }}
                  />
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Show previous project"
            onClick={() => {
              if (isMobileViewport) selectSlide(Math.max(0, activeIndex - 1))
              else showPrevious()
            }}
            className="absolute bottom-4 right-16 z-20 hidden size-10 translate-y-0 cursor-pointer items-center justify-center rounded-full bg-black/55 text-text-on-media-strong backdrop-blur-[40px] transition-colors duration-150 hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-floating dark:hover:bg-white/25 tablet:bottom-auto tablet:left-8 tablet:right-auto tablet:top-1/2 tablet:flex tablet:-translate-y-1/2"
          >
            <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4.5L6.5 9l4.5 4.5" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Show next project"
            onClick={() => {
              if (isMobileViewport) selectSlide(Math.min(projects.length - 1, activeIndex + 1))
              else showNext()
            }}
            className="absolute bottom-4 right-4 z-20 hidden size-10 translate-y-0 cursor-pointer items-center justify-center rounded-full bg-black/55 text-text-on-media-strong backdrop-blur-[40px] transition-colors duration-150 hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:bg-floating dark:hover:bg-white/25 tablet:bottom-auto tablet:right-8 tablet:top-1/2 tablet:flex tablet:-translate-y-1/2"
          >
            <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 4.5L11.5 9 7 13.5" />
            </svg>
          </button>
        </>
      ) : null}

      <div
        role="group"
        aria-label={`${activeIndex + 1} of ${projects.length}: ${activeProject.title}`}
        aria-roledescription="slide"
        className="pointer-events-none absolute inset-x-10 bottom-10 z-10 hidden items-end gap-10 tablet:grid tablet:grid-cols-2 desktop:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]"
      >
        <div className="relative min-w-0">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={activeProject.id}
              className="min-w-0"
              initial={prefersReducedMotion ? false : { opacity: 0, x: '3%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: '-3%' }}
              transition={transition}
            >
              <Link
                href={`/work/${activeProject.slug}`}
                className="pointer-events-auto flex flex-col gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <h2 className="hero-project-title text-balance">{activeProject.title}</h2>
                {activeProject.subtitle ? (
                  <p className="max-w-2xl text-body text-pretty text-text-on-media-muted">
                    {activeProject.subtitle}
                  </p>
                ) : null}
                <HeroProjectPills pills={activeProject.pills} />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative hidden w-full max-w-[480px] justify-self-end tablet:grid">
          <AnimatePresence initial={false} mode="sync">
            {activeProject.testimonial ? (
              <motion.div
                key={activeProject.testimonial.id}
                className="w-full self-end [grid-area:1/1]"
                initial={prefersReducedMotion ? false : { opacity: 0, x: '3%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: '-3%' }}
                transition={transition}
              >
                <Testimonial
                  quote={activeProject.testimonial.quote}
                  name={activeProject.testimonial.name}
                  variant="hero"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

        </motion.section>

      {cursorPortalRoot ? createPortal(
        <motion.div
          aria-hidden="true"
          className="hero-case-study-cursor pointer-events-none fixed left-0 top-0 z-20"
          // Mount hidden at (0, 0); only pointer input should reveal the cursor.
          initial={false}
          animate={{
            opacity: isCaseStudyCursorVisible ? 1 : 0,
            scale: isCaseStudyCursorVisible ? 1 : 0,
          }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.08, ease: 'easeOut' }}
          style={{
            x: caseStudyCursorX,
            y: caseStudyCursorY,
            transformOrigin: '0 0',
          }}
        >
          <div className="relative size-40 -translate-x-1/2 -translate-y-1/2 text-text-on-media-strong">
            <motion.svg
              aria-hidden="true"
              className="absolute inset-0 size-full overflow-visible"
              viewBox="0 0 176 176"
              fill="currentColor"
              style={{ rotate: caseStudyCursorRotation, transformOrigin: '50% 50%' }}
            >
              <defs>
                <path
                  id={cursorTextPathId}
                  d="M88 14a74 74 0 1 1-.01 0"
                />
              </defs>
              <text className="text-lg">
                <textPath
                  href={`#${cursorTextPathId}`}
                  lengthAdjust="spacingAndGlyphs"
                  textLength="452"
                >
                  {`GO TO ${activeProject.title.toUpperCase()} PROJECT · `.repeat(2).trim()}
                </textPath>
              </text>
            </motion.svg>
            <svg
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            >
              <path d="M6 16h20M18 8l8 8-8 8" />
            </svg>
          </div>
        </motion.div>,
        cursorPortalRoot,
      ) : null}
    </div>
  )
}

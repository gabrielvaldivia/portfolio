'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
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
  gradientColor?: string
  featuredImage?: {
    url: string
    alt?: string | null
  }
  testimonial?: HeroTestimonial
}

type Props = {
  projects: HeroProjectSlide[]
}

const AUTOPLAY_DELAY_MS = 6000
const CURSOR_IDLE_ROTATION_SPEED = 14

function samplePredominantImageColor(image: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !image.naturalWidth || !image.naturalHeight) return null

  const sampleSize = 24
  const renderedAspect = image.clientWidth / image.clientHeight
  const naturalAspect = image.naturalWidth / image.naturalHeight
  let sourceX = 0
  let sourceY = 0
  let sourceWidth = image.naturalWidth
  let sourceHeight = image.naturalHeight

  if (naturalAspect > renderedAspect) {
    sourceWidth = sourceHeight * renderedAspect
    sourceX = (image.naturalWidth - sourceWidth) / 2
  } else {
    sourceHeight = sourceWidth / renderedAspect
    sourceY = (image.naturalHeight - sourceHeight) / 2
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

export function HeroProjectSlideshow({ projects }: Props) {
  const cursorTextPathId = `hero-cursor-${useId().replaceAll(':', '')}`
  const regionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(regionRef, { amount: 0.25 })
  const prefersReducedMotion = useReducedMotion()
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
  const [heroGradientColor, setHeroGradientColor] = useState('24 24 24')

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

  const updateHeroGradientColor = useCallback((image: HTMLImageElement, projectId: string) => {
    const activeProject = projects[activeIndex]
    if (activeProject?.id !== projectId || activeProject.gradientColor) return

    try {
      const color = samplePredominantImageColor(image)
      if (color) setHeroGradientColor(color)
    } catch {
      setHeroGradientColor('24 24 24')
    }
  }, [activeIndex, projects])

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
    projects.length > 1 && !isFocusPaused && isInView && !prefersReducedMotion

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

      insetScale.set(Math.max(0.8, (width - gutter * 2) / width))
      insetRadius.set(radius)
      expansionDistance.set(Math.max(240, window.innerHeight * 0.35))
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
  const resolvedHeroGradientColor = hexToRgbChannels(activeProject.gradientColor) ?? heroGradientColor
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.6, ease: 'easeOut' as const }

  return (
    <div ref={regionRef} className="w-full">
      <motion.section
        role="region"
        aria-label="Featured projects"
        aria-roledescription="carousel"
        className="hero-project-slideshow relative aspect-[3/4] w-full origin-center overflow-hidden bg-background-alt tablet:aspect-video"
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
        {activeProject.featuredImage?.url ? (
          <motion.div
            key={activeProject.id}
            className="absolute inset-0"
            initial={prefersReducedMotion ? false : { opacity: 0, x: '3%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: '-3%' }}
            transition={transition}
          >
            <Image
              src={activeProject.featuredImage.url}
              alt={activeProject.featuredImage.alt || ''}
              fill
              className="object-cover"
              sizes="100vw"
              quality={90}
              priority={activeIndex === 0}
              onLoad={(event) => updateHeroGradientColor(event.currentTarget, activeProject.id)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Link
        href={`/work/${activeProject.slug}`}
        aria-label={`View ${activeProject.title} project`}
        className="absolute inset-0 z-0"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 tablet:hidden"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgb(${resolvedHeroGradientColor} / 0), rgb(${resolvedHeroGradientColor} / 0.72) 62%, rgb(${resolvedHeroGradientColor}) 100%)`,
        }}
      />

      {projects.length > 1 ? (
        <>
          <div className="absolute right-4 top-3 z-10 flex gap-1 tablet:right-8 tablet:top-6">
            {projects.map((project, index) => (
              <button
                key={project.id}
                type="button"
                aria-label={`Show ${project.title}, slide ${index + 1} of ${projects.length}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
                className="group inline-flex h-8 items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="relative block h-1 w-7 overflow-hidden rounded-full bg-black/35 shadow-sm transition-opacity duration-150 group-hover:opacity-75">
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 origin-left rounded-full bg-white"
                    style={{
                      scaleX: index === activeIndex ? (prefersReducedMotion ? 1 : progress) : 0,
                    }}
                  />
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Show previous project"
            onClick={showPrevious}
            className="absolute bottom-4 right-16 z-20 flex size-10 translate-y-0 cursor-pointer items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors duration-150 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white tablet:bottom-auto tablet:left-8 tablet:right-auto tablet:top-1/2 tablet:-translate-y-1/2"
          >
            <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M11 4.5L6.5 9l4.5 4.5" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Show next project"
            onClick={showNext}
            className="absolute bottom-4 right-4 z-20 flex size-10 translate-y-0 cursor-pointer items-center justify-center rounded-full bg-floating backdrop-blur-[40px] transition-colors duration-150 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white tablet:bottom-auto tablet:right-8 tablet:top-1/2 tablet:-translate-y-1/2"
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
        className="pointer-events-none absolute inset-x-5 bottom-5 z-10 grid items-end gap-5 tablet:inset-x-10 tablet:bottom-10 tablet:grid-cols-2 tablet:gap-10 desktop:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]"
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
                className="pointer-events-auto flex flex-col gap-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
              >
                <h2 className="hero-project-title text-balance">{activeProject.title}</h2>
                {activeProject.subtitle ? (
                  <p className="max-w-2xl text-body text-pretty text-muted">
                    {activeProject.subtitle}
                  </p>
                ) : null}
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
          <div className="relative size-40 -translate-x-1/2 -translate-y-1/2 text-white">
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

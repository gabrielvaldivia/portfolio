'use client'

import Link from 'next/link'
import { animate, useInView, useReducedMotion, type AnimationPlaybackControls } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { PayloadImage } from '@/components/PayloadImage'
import { HeroProjectPills } from '@/components/HeroProjectPills'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'

type Project = {
  id: string
  title: string
  slug: string
  subtitle?: string
  pills?: string[]
  featuredImage?: ResponsiveImageMedia
}

function ProjectVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const visible = useInView(ref, { amount: 0.25 })
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.defaultMuted = true
    video.muted = true
    video.volume = 0
    if (visible && !reducedMotion) void video.play().catch(() => {})
    else video.pause()
  }, [visible, reducedMotion])

  return <video ref={ref} src={src} muted playsInline loop preload="metadata" aria-hidden="true" className="size-full object-cover" />
}

export function HeroProjectStrip({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [displayProjects, setDisplayProjects] = useState(projects)
  const reducedMotion = useReducedMotion()
  const drag = useRef<{ x: number; left: number; active: boolean } | null>(null)
  const suppressClick = useRef(false)
  const animation = useRef<AnimationPlaybackControls | null>(null)

  useEffect(() => () => { animation.current?.stop() }, [])

  useLayoutEffect(() => {
    // Reordering the cards can make scroll anchoring keep a moved card in view.
    // Start each new project order at the first card.
    ref.current?.scrollTo({ left: 0, behavior: 'instant' })
  }, [displayProjects])

  useEffect(() => {
    const shuffled = [...projects]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
    }
    setDisplayProjects(shuffled)
  }, [projects])

  const getSnapPoints = (track: HTMLDivElement) => {
    const cards = [...track.querySelectorAll<HTMLElement>('[data-project-card]')]
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth)
    const trackLeft = track.getBoundingClientRect().left
    const points = cards.map((card, index) => {
      if (index === 0) return 0
      if (index === cards.length - 1) return maxScroll
      const left = card.getBoundingClientRect().left - trackLeft + track.scrollLeft
      return Math.max(0, Math.min(left + card.clientWidth / 2 - track.clientWidth / 2, maxScroll))
    })
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0
    return { points, step }
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    drag.current = null
    const track = ref.current
    if (!track || !current?.active) return
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    track.style.cursor = ''
    const { points: snapPoints, step } = getSnapPoints(track)
    const distance = current.left - track.scrollLeft
    const startIndex = snapPoints.reduce((closest, point, index) =>
      Math.abs(point - current.left) < Math.abs(snapPoints[closest] - current.left) ? index : closest, 0)
    const crossedThreshold = Math.abs(distance) > Math.min(80, step * 0.15)
    const pages = crossedThreshold ? Math.max(1, Math.round(Math.abs(distance) / step)) : 0
    const index = startIndex - Math.sign(distance) * pages
    const target = snapPoints[Math.max(0, Math.min(index, snapPoints.length - 1))] ?? 0
    const restoreSnap = () => { track.style.scrollSnapType = '' }
    if (!step || reducedMotion) {
      track.scrollLeft = target || 0
      restoreSnap()
      return
    }
    animation.current = animate(track.scrollLeft, target, {
      duration: 0.18,
      ease: 'easeOut',
      onUpdate: left => { track.scrollLeft = left },
      onComplete: restoreSnap,
    })
  }

  return (
    <section aria-label="Featured projects" className="hero-project-strip">
      <div
        ref={ref}
        role="region"
        aria-label="Scroll through featured projects"
        tabIndex={0}
        className="hero-project-strip-viewport relative cursor-grab overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-hide focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
        onPointerDown={event => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return
          animation.current?.stop()
          event.currentTarget.style.scrollSnapType = ''
          suppressClick.current = false
          drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, active: false }
        }}
        onPointerMove={event => {
          const current = drag.current
          if (!current) return
          const distance = event.clientX - current.x
          if (!current.active && Math.abs(distance) < 6) return
          if (!current.active) {
            current.active = true
            suppressClick.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            event.currentTarget.style.scrollSnapType = 'none'
            event.currentTarget.style.cursor = 'grabbing'
          }
          event.preventDefault()
          event.currentTarget.scrollLeft = current.left - distance
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onPointerLeave={() => { if (!drag.current?.active) drag.current = null }}
        onClickCapture={event => {
          if (!suppressClick.current || event.detail === 0) return
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }}
        onDragStart={event => event.preventDefault()}
      >
        <div className="hero-project-strip-track flex items-start select-none">
          {displayProjects.map((project, index) => {
            const media = project.featuredImage
            const video = media?.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(media?.url || '')
            return (
              <Link
                key={project.id}
                href={`/work/${project.slug}`}
                data-project-card
                draggable={false}
                className="hero-project-strip-card group min-w-0 shrink-0 relative overflow-hidden rounded-xl bg-background-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content tablet:rounded-2xl"
              >
                <div className="relative aspect-[3/2] overflow-hidden">
                  {media?.url ? video ? <ProjectVideo src={media.url} /> : (
                    <PayloadImage media={media} alt={media.alt || project.title} fill draggable={false} className="object-cover" sizes="(min-width: 1400px) 1110px, (min-width: 810px) 80vw, 90vw" priority={index === 0} />
                  ) : <div className="flex size-full items-center justify-center text-text-muted">{project.title}</div>}
                </div>
                <div className="hero-project-strip-shade pointer-events-none absolute inset-0" aria-hidden="true" />
                <div className="pointer-events-none absolute inset-x-5 bottom-5 pr-12 tablet:inset-x-8 tablet:bottom-8 tablet:pr-16">
                  <h2 className="hero-project-title text-balance text-text-on-media-strong">{project.title}</h2>
                  {project.subtitle && <p className="mt-2 max-w-2xl text-pretty text-text-on-media-body">{project.subtitle}</p>}
                  <HeroProjectPills pills={project.pills} />
                </div>
                <span aria-hidden="true" className="pointer-events-none absolute right-5 bottom-5 flex size-11 items-center justify-center rounded-full bg-white text-black opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 tablet:right-8 tablet:bottom-8 tablet:size-12">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                </span>
              </Link>
            )
          })}
        </div>
      </div>

    </section>
  )
}

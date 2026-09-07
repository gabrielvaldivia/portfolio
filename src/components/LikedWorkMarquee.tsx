'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { ActivityVideoThumbnail } from '@/components/ActivityVideoThumbnail'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { cn } from '@/lib/cn'
import { advanceMarquee, getMarqueeReleaseVelocity, wrapMarqueePosition, type DragSample } from '@/lib/marqueeMotion'

type LikedWorkThumbnail = {
  type: 'image' | 'video'
  url: string
  alt: string
  width?: number
  height?: number
  fit?: 'cover' | 'contain'
  padding?: string
  backgroundColor?: string
  imageBorder?: boolean
  rounded?: boolean
  cropFromTop?: boolean
  browser?: {
    address?: string
  }
  frame?: {
    id: string
    url: string
    aspectRatio: string
    screen: CSSProperties
  }
}

export type LikedWorkMarqueeItem = {
  id: string
  href: string
  title: string
  likeCount: number
  aspectRatio: string
  thumbnail: LikedWorkThumbnail
}

function WorkMedia({
  thumbnail,
  className,
}: {
  thumbnail: LikedWorkThumbnail
  className: string
}) {
  if (thumbnail.type === 'video') {
    return (
      <ActivityVideoThumbnail
        src={thumbnail.url}
        className={className}
        autoplayWhenVisible
      />
    )
  }

  return (
    <Image
      src={thumbnail.url}
      alt=""
      fill
      unoptimized
      sizes="(max-width: 809px) 384px, (max-width: 1279px) 512px, 560px"
      quality={90}
      className={className}
    />
  )
}

function WorkThumbnail({ thumbnail }: { thumbnail: LikedWorkThumbnail }) {
  const cropFromTop = Boolean(thumbnail.cropFromTop)
  const mediaClassName = cn(
    'block size-full',
    cropFromTop
      ? 'object-cover object-top'
      : thumbnail.fit === 'contain'
        ? 'object-contain object-center'
        : 'object-cover object-center',
  )

  if (thumbnail.browser) {
    return (
      <div className="flex size-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background-alt p-4 tablet:rounded-2xl tablet:p-5" aria-hidden="true">
        <div className="flex size-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-elevated shadow-sm tablet:rounded-xl">
          <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-gray-200 px-2.5 tablet:h-10 tablet:px-3">
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-red-400 tablet:size-2" />
              <span className="size-1.5 rounded-full bg-yellow-400 tablet:size-2" />
              <span className="size-1.5 rounded-full bg-green-400 tablet:size-2" />
            </div>
            <div className="flex h-4 min-w-0 flex-1 items-center justify-center rounded-full bg-white/80 px-2 tablet:h-5">
              {thumbnail.browser.address && (
                <span className="truncate text-[8px] leading-none text-text-on-light-muted tablet:text-[9px]">
                  {thumbnail.browser.address}
                </span>
              )}
            </div>
            <div className="w-5 shrink-0 tablet:w-6" />
          </div>
          <div className="relative min-h-0 flex-1 bg-background">
            <WorkMedia thumbnail={thumbnail} className={mediaClassName} />
          </div>
        </div>
      </div>
    )
  }

  if (thumbnail.frame) {
    return (
      <div className="flex size-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background-alt p-4 tablet:rounded-2xl tablet:p-5" aria-hidden="true">
        <div
          className="relative h-full max-h-full max-w-full"
          style={{ aspectRatio: thumbnail.frame.aspectRatio }}
        >
          <div
            className="absolute z-0 overflow-hidden bg-black"
            style={thumbnail.frame.screen}
          >
            <WorkMedia thumbnail={thumbnail} className={mediaClassName} />
          </div>
          <Image
            src={thumbnail.frame.url}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 809px) 384px, (max-width: 1279px) 512px, 560px"
            quality={90}
            className="pointer-events-none z-10 object-contain"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="size-full overflow-hidden rounded-xl border border-border bg-background-alt tablet:rounded-2xl"
      style={{
        ...(thumbnail.backgroundColor ? { backgroundColor: thumbnail.backgroundColor } : {}),
        ...(thumbnail.padding
          ? cropFromTop
            ? {
                paddingTop: thumbnail.padding,
                paddingRight: thumbnail.padding,
                paddingBottom: 0,
                paddingLeft: thumbnail.padding,
              }
            : { padding: thumbnail.padding }
          : {}),
      }}
      aria-hidden="true"
    >
      <div
        className={cn(
          'relative size-full overflow-hidden',
          thumbnail.rounded && (
            cropFromTop
              ? 'rounded-t-lg tablet:rounded-t-xl'
              : 'rounded-lg tablet:rounded-xl'
          ),
          thumbnail.imageBorder && (
            cropFromTop
              ? 'border-x border-t border-border'
              : 'border border-border'
          ),
        )}
      >
        <WorkMedia thumbnail={thumbnail} className={mediaClassName} />
      </div>
    </div>
  )
}

function WorkCard({
  item,
  duplicate = false,
  reduceMotion = false,
}: {
  item: LikedWorkMarqueeItem
  duplicate?: boolean
  reduceMotion?: boolean
}) {
  return (
    <motion.div
      className="group relative h-[216px] shrink-0 rounded-xl hover:z-10 focus-within:z-10 tablet:h-[288px] tablet:rounded-2xl desktop:h-[315px]"
      style={{ aspectRatio: item.aspectRatio }}
      whileHover={reduceMotion ? undefined : { scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.35 }}
    >
      <Link
        href={item.href}
        aria-label={item.title}
        tabIndex={duplicate ? -1 : undefined}
        draggable={false}
        className="block size-full cursor-inherit rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content tablet:rounded-2xl"
      >
        <WorkThumbnail thumbnail={item.thumbnail} />
      </Link>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 desktop:block">
        <LazyModuleLikeButton
          targetId={item.id}
          initialCount={item.likeCount}
          tabIndex={duplicate ? -1 : undefined}
        />
      </div>
    </motion.div>
  )
}

const MARQUEE_SPEED_PX_PER_SECOND = -64

type MarqueeDrag = {
  pointerId: number
  startX: number
  startY: number
  startOffset: number
  active: boolean
  samples: DragSample[]
}

export function LikedWorkMarquee({ items }: { items: LikedWorkMarqueeItem[] }) {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const firstGroupRef = useRef<HTMLDivElement>(null)
  const duplicateGroupRef = useRef<HTMLDivElement>(null)
  const loopDistanceRef = useRef(0)
  const isInView = useInView(marqueeRef, { amount: 0.1 })
  const prefersReducedMotion = useReducedMotion()
  const [isDragging, setIsDragging] = useState(false)
  const hoveredRef = useRef(false)
  const focusedRef = useRef(false)
  const dragRef = useRef<MarqueeDrag | null>(null)
  const suppressClickRef = useRef(false)
  const velocityRef = useRef(MARQUEE_SPEED_PX_PER_SECOND)
  const coastingRef = useRef(false)
  const x = useMotionValue(0)

  useEffect(() => {
    const firstGroup = firstGroupRef.current
    const duplicateGroup = duplicateGroupRef.current
    if (!firstGroup || !duplicateGroup) return

    const updateLoopDistance = () => {
      loopDistanceRef.current = duplicateGroup.offsetLeft - firstGroup.offsetLeft
    }
    const observer = new ResizeObserver(updateLoopDistance)

    updateLoopDistance()
    observer.observe(firstGroup)
    observer.observe(duplicateGroup)

    return () => observer.disconnect()
  }, [items])

  useAnimationFrame((_time, delta) => {
    if (!isInView || prefersReducedMotion || dragRef.current) return

    const loopDistance = loopDistanceRef.current
    if (loopDistance <= 0) return

    const target = hoveredRef.current || focusedRef.current ? 0 : MARQUEE_SPEED_PX_PER_SECOND
    const next = advanceMarquee(velocityRef.current, target, Math.min(delta, 64) / 1000, coastingRef.current ? 0.5 : 0.22)
    velocityRef.current = next.velocity
    if (Math.abs(next.velocity - target) < 0.5) {
      velocityRef.current = target
      coastingRef.current = false
      if (target === 0) return
    }
    x.set(wrapMarqueePosition(x.get() + next.distance, loopDistance))
  })

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    suppressClickRef.current = false
    if (prefersReducedMotion || !event.isPrimary || event.button !== 0 || dragRef.current) return
    if ((event.target as Element).closest('button, input, textarea, select, [role="button"]')) return
    velocityRef.current = 0
    coastingRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: x.get(),
      active: false,
      samples: [{ x: event.clientX, time: event.timeStamp }],
    }
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.active) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 6) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        dragRef.current = null
        return
      }
      drag.active = true
      suppressClickRef.current = true
      setIsDragging(true)
      // Capture only after dragging starts, so a normal click still reaches its link.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= 100)
    drag.samples.push({ x: event.clientX, time: event.timeStamp })
    x.set(wrapMarqueePosition(drag.startOffset + deltaX, loopDistanceRef.current))
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    hoveredRef.current = event.pointerType !== 'touch'
      && event.clientX >= bounds.left && event.clientX <= bounds.right
      && event.clientY >= bounds.top && event.clientY <= bounds.bottom
    velocityRef.current = drag.active && event.type === 'pointerup'
      ? getMarqueeReleaseVelocity(drag.samples, event.timeStamp)
      : 0
    coastingRef.current = Math.abs(velocityRef.current) > 0
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (!items.length) return null

  return (
    <div
      ref={marqueeRef}
      className={cn(
        'liked-work-marquee -my-2 w-full min-w-0 overflow-hidden py-2',
        prefersReducedMotion ? 'overflow-x-auto' : 'touch-pan-y select-none',
        !prefersReducedMotion && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
      )}
      role="region"
      aria-label="Most liked work"
      onPointerEnter={(event) => { hoveredRef.current = event.pointerType !== 'touch' }}
      onPointerLeave={() => {
        hoveredRef.current = false
        if (dragRef.current && !dragRef.current.active) dragRef.current = null
      }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={(event) => {
        // Touch begins with implicit capture on the image/video. Its capture loss
        // bubbles when we take over; only our own capture loss ends the drag.
        if (event.target === event.currentTarget) finishDrag(event)
      }}
      onDragStartCapture={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (suppressClickRef.current && event.detail > 0) {
          event.preventDefault()
          event.stopPropagation()
          suppressClickRef.current = false
        }
      }}
      onFocus={(event) => { focusedRef.current = event.target.matches(':focus-visible') }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) focusedRef.current = false
      }}
    >
      <motion.div
        className="liked-work-marquee-track"
        style={{ x }}
      >
        <div ref={firstGroupRef} className="liked-work-marquee-group" role="list">
          {items.map((item) => (
            <div key={item.id} role="listitem">
              <WorkCard item={item} reduceMotion={Boolean(prefersReducedMotion)} />
            </div>
          ))}
        </div>
        <div ref={duplicateGroupRef} className="liked-work-marquee-group" aria-hidden="true">
          {items.map((item) => (
            <div key={`duplicate-${item.id}`}>
              <WorkCard item={item} duplicate reduceMotion={Boolean(prefersReducedMotion)} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

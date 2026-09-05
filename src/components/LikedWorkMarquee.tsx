'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ActivityVideoThumbnail } from '@/components/ActivityVideoThumbnail'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { cn } from '@/lib/cn'

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
                <span className="truncate text-[8px] leading-none text-black/45 tablet:text-[9px]">
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
        className="block size-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content tablet:rounded-2xl"
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

export function LikedWorkMarquee({ items }: { items: LikedWorkMarqueeItem[] }) {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const firstGroupRef = useRef<HTMLDivElement>(null)
  const duplicateGroupRef = useRef<HTMLDivElement>(null)
  const loopDistanceRef = useRef(0)
  const isInView = useInView(marqueeRef, { amount: 0.1 })
  const prefersReducedMotion = useReducedMotion()
  const [isInteracting, setIsInteracting] = useState(false)
  const x = useMotionValue(0)
  const speed = useMotionValue(MARQUEE_SPEED_PX_PER_SECOND)

  useEffect(() => {
    const controls = animate(
      speed,
      isInteracting ? 0 : MARQUEE_SPEED_PX_PER_SECOND,
      {
        duration: isInteracting ? 0.8 : 0.55,
        ease: 'easeOut',
      },
    )

    return () => controls.stop()
  }, [isInteracting, speed])

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
    if (!isInView || prefersReducedMotion) return

    const loopDistance = loopDistanceRef.current
    if (loopDistance <= 0) return

    let nextX = x.get() + speed.get() * (Math.min(delta, 64) / 1000)
    if (nextX <= -loopDistance) nextX += loopDistance
    x.set(nextX)
  })

  if (!items.length) return null

  return (
    <div
      ref={marqueeRef}
      className={cn(
        'liked-work-marquee hscroll-masked -my-2 w-full min-w-0 overflow-hidden py-2',
        prefersReducedMotion && 'overflow-x-auto',
      )}
      role="region"
      aria-label="Most liked work"
      onPointerEnter={() => setIsInteracting(true)}
      onPointerLeave={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false)
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

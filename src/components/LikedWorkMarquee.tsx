'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { ActivityVideoThumbnail } from '@/components/ActivityVideoThumbnail'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { PayloadImage } from '@/components/PayloadImage'
import { cn } from '@/lib/cn'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'
import {
  advanceMarquee,
  getCircularMarqueeEntries,
  getMarqueeReleaseVelocity,
  getMarqueeWindowSize,
  orderRightwardMarqueeItems,
  type DragSample,
  type MarqueeRowExpansion,
} from '@/lib/marqueeMotion'

type LikedWorkThumbnail = ResponsiveImageMedia & {
  type: 'image' | 'video'
  url: string
  alt: string
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
  imageLoading,
}: {
  thumbnail: LikedWorkThumbnail
  className: string
  imageLoading: 'eager' | 'lazy'
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
    <PayloadImage
      media={thumbnail}
      alt=""
      {...(thumbnail.browser && thumbnail.width && thumbnail.height
        ? { width: thumbnail.width, height: thumbnail.height }
        : { fill: true })}
      sizes="(max-width: 809px) 384px, (max-width: 1279px) 512px, 560px"
      loading={imageLoading}
      className={className}
    />
  )
}

function WorkThumbnail({
  thumbnail,
  imageLoading,
}: {
  thumbnail: LikedWorkThumbnail
  imageLoading: 'eager' | 'lazy'
}) {
  const cropFromTop = Boolean(thumbnail.browser || thumbnail.cropFromTop)
  const mediaClassName = cn(
    'block',
    thumbnail.browser ? 'h-auto w-full' : 'size-full',
    cropFromTop
      ? 'object-cover object-top'
      : thumbnail.fit === 'contain'
        ? 'object-contain object-center'
        : 'object-cover object-center',
  )

  if (thumbnail.browser) {
    return (
      <div className="flex size-full items-center justify-center overflow-hidden rounded-xl border border-border bg-background-alt p-4 tablet:rounded-2xl tablet:p-5" aria-hidden="true">
        {/* Bar and corner sizes use container width units so the window keeps its proportions at any card size.
            The wrapper is the container because an element's own container units can't size its corners. */}
        <div className="@container size-full min-h-0">
        <div className="@container flex size-full min-h-0 flex-col overflow-hidden rounded-[1.25cqw] border border-border bg-elevated shadow-sm">
          <div className="grid h-[4.4cqw] shrink-0 grid-cols-[1fr_minmax(0,2fr)_1fr] items-center gap-[1.1cqw] border-b border-border bg-gray-200 px-[1.5cqw]">
            <div className="flex shrink-0 items-center gap-[0.75cqw]">
              <span className="size-[0.95cqw] rounded-full bg-red-400" />
              <span className="size-[0.95cqw] rounded-full bg-yellow-400" />
              <span className="size-[0.95cqw] rounded-full bg-green-400" />
            </div>
            <div className="flex h-[2.3cqw] min-w-0 items-center justify-center rounded-full bg-white/80 px-[1.15cqw]">
              {thumbnail.browser.address && (
                <span className="truncate text-[1.35cqw] leading-none text-text-on-light-muted">
                  {thumbnail.browser.address}
                </span>
              )}
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
            <WorkMedia thumbnail={thumbnail} className={mediaClassName} imageLoading={imageLoading} />
          </div>
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
            <WorkMedia thumbnail={thumbnail} className={mediaClassName} imageLoading={imageLoading} />
          </div>
          <Image
            src={thumbnail.frame.url}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 809px) 384px, (max-width: 1279px) 512px, 560px"
            loading={imageLoading}
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
        <WorkMedia thumbnail={thumbnail} className={mediaClassName} imageLoading={imageLoading} />
      </div>
    </div>
  )
}

function WorkCard({
  item,
  duplicate = false,
  reduceMotion = false,
  imageLoading,
  loadMedia,
  rowIndex,
  expanded,
  onToggle,
}: {
  item: LikedWorkMarqueeItem
  duplicate?: boolean
  reduceMotion?: boolean
  imageLoading: 'eager' | 'lazy'
  loadMedia: boolean
  rowIndex: number
  expanded?: { width: number; height: number; inset: number }
  onToggle?: () => void
}) {
  const inset = expanded ? `${expanded.inset}px` : '0px'
  return (
    <motion.div
      className="group absolute left-1/2 rounded-xl hover:z-10 focus-within:z-10 tablet:rounded-2xl"
      // The card overflows its fixed slot when expanded, growing toward the other row.
      style={{
        translate: '-50% 0',
        top: rowIndex === 0 ? inset : undefined,
        bottom: rowIndex === 0 ? undefined : inset,
        height: expanded ? `${expanded.height}px` : '100%',
        width: expanded ? `${expanded.width}px` : '100%',
        transition: CARD_TRANSITION,
      }}
      whileHover={reduceMotion || expanded ? undefined : { scale: 1.012 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22, mass: 0.35 }}
    >
      <Link
        href={item.href}
        aria-label={item.title}
        tabIndex={duplicate ? -1 : undefined}
        draggable={false}
        onClick={onToggle ? (event) => {
          // Keyboard activation and modified clicks keep normal link behavior.
          if (event.detail === 0 || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onToggle()
        } : undefined}
        className="block size-full cursor-inherit rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content tablet:rounded-2xl"
      >
        {loadMedia && <WorkThumbnail thumbnail={item.thumbnail} imageLoading={imageLoading} />}
      </Link>
      {/* The name shows on hover and stays while expanded; it opens the project. */}
      <div
        className={cn(
          // Leave room for the like pill on the right.
          'absolute bottom-3 left-3 z-20 max-w-[calc(100%-6.5rem)] transition-opacity duration-150',
          expanded
            ? 'opacity-100 delay-150'
            : 'pointer-events-none hidden opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [@media(hover:hover)]:block',
        )}
      >
        <Link
          href={item.href}
          draggable={false}
          tabIndex={expanded ? undefined : -1}
          aria-hidden={expanded ? undefined : 'true'}
          // Matches the like pill.
          className="inline-flex h-8 max-w-full items-center rounded-full bg-black/20 px-2.5 text-caption font-medium text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/30 focus-visible:ring-2 focus-visible:ring-content/30 dark:hover:bg-white/15"
        >
          <span className="truncate">{item.title}</span>
        </Link>
      </div>
      <AnimatePresence>
        {Boolean(expanded) && (
          <motion.div
            className="absolute right-3 bottom-3 z-20"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.18, duration: 0.24, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <LazyModuleLikeButton
              targetId={item.id}
              initialCount={item.likeCount}
              tabIndex={duplicate ? -1 : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Expanding a card shifts its neighbors and grows it across both rows together.
const EXPAND_EASING = '560ms cubic-bezier(0.32, 0.72, 0, 1)'
const SLOT_TRANSITION = `translate ${EXPAND_EASING}`
const CARD_TRANSITION = ['width', 'height', 'top', 'bottom']
  .map((property) => `${property} ${EXPAND_EASING}`)
  .join(', ')

const MARQUEE_SPEED_PX_PER_SECOND = -44
const DEFAULT_MARQUEE_WINDOW_SIZE = 8

type MarqueeDrag = {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  active: boolean
  samples: DragSample[]
}

export function LikedWorkMarquee({
  items,
  direction = 'left',
  label = 'Most liked work',
  rowIndex = 0,
  expansion = null,
  expanded = false,
  onToggleCard,
  onCollapse,
}: {
  items: LikedWorkMarqueeItem[]
  direction?: 'left' | 'right'
  label?: string
  rowIndex?: number
  /** Shifts for this row while any card in the group is expanded. */
  expansion?: MarqueeRowExpansion | null
  expanded?: boolean
  onToggleCard?: (rowIndex: number, position: number) => void
  onCollapse?: () => void
}) {
  const autoSpeed = direction === 'right' ? -MARQUEE_SPEED_PX_PER_SECOND : MARQUEE_SPEED_PX_PER_SECOND
  const marqueeRef = useRef<HTMLDivElement>(null)
  const firstCardRef = useRef<HTMLDivElement>(null)
  const nextWindowRef = useRef<HTMLDivElement>(null)
  const loopDistanceRef = useRef(0)
  const windowStartRef = useRef(0)
  const isInView = useInView(marqueeRef, { amount: 0.1 })
  // Reserve the card layout immediately, but let the hero and portrait load
  // before requesting this section's media. Keep it mounted after the first visit.
  const shouldLoadMedia = useInView(marqueeRef, { margin: '400px 0px', once: true })
  const prefersReducedMotion = useReducedMotion()
  const [isDragging, setIsDragging] = useState(false)
  const [keyboardExpanded, setKeyboardExpanded] = useState(false)
  const [windowSize, setWindowSize] = useState(() => (
    Math.min(items.length, DEFAULT_MARQUEE_WINDOW_SIZE)
  ))
  const [windowStart, setWindowStart] = useState(0)
  const focusedRef = useRef(false)
  const dragRef = useRef<MarqueeDrag | null>(null)
  const suppressClickRef = useRef(false)
  const velocityRef = useRef(autoSpeed)
  const coastingRef = useRef(false)
  const x = useMotionValue(0)
  const effectiveWindowSize = Math.min(windowSize, items.length)
  const renderAllItems = Boolean(prefersReducedMotion || keyboardExpanded)
  const canExpand = !renderAllItems && Boolean(onToggleCard)
  // While expanded, mount one extra window on the left so shifted cards never reveal an empty edge.
  const lead = expanded && !renderAllItems ? effectiveWindowSize : 0
  const leadOffsetRef = useRef(0)
  const isRightward = direction === 'right' && !renderAllItems
  // Rightward rows start with their top-ranked card at the right edge.
  const orderedItems = useMemo(
    () => isRightward ? orderRightwardMarqueeItems(items, effectiveWindowSize) : items,
    [isRightward, items, effectiveWindowSize],
  )
  const mountedEntries = getCircularMarqueeEntries(
    orderedItems,
    windowStart - lead,
    renderAllItems ? items.length : effectiveWindowSize * 2 + lead,
  )

  useEffect(() => {
    const marquee = marqueeRef.current
    if (!marquee) return

    const updateWindowSize = () => {
      const nextWindowSize = getMarqueeWindowSize(
        marquee.getBoundingClientRect().width,
        items.length,
      )
      setWindowSize((current) => current === nextWindowSize ? current : nextWindowSize)
    }
    const observer = new ResizeObserver(updateWindowSize)

    updateWindowSize()
    observer.observe(marquee)

    return () => observer.disconnect()
  }, [items.length])

  useLayoutEffect(() => {
    windowStartRef.current = 0
    setWindowStart(0)
    x.set(0)
  }, [orderedItems, x])

  useLayoutEffect(() => {
    if (renderAllItems) {
      loopDistanceRef.current = 0
      x.set(0)
      return
    }

    const firstCard = firstCardRef.current
    const nextWindow = nextWindowRef.current
    const distance = firstCard && nextWindow
      ? nextWindow.offsetLeft - firstCard.offsetLeft
      : 0
    loopDistanceRef.current = distance

    const marquee = marqueeRef.current
    const track = marquee?.querySelector('.liked-work-marquee-track')
    if (!isRightward || !marquee || !track || distance <= 0) {
      x.set(0)
      return
    }
    // Align the first window's last card, the top-ranked one, to the right edge.
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const offset = marquee.clientWidth - (distance - gap)
    x.set(Math.min(0, Math.max(offset, -distance + 1)))
  }, [effectiveWindowSize, renderAllItems, isRightward, orderedItems, x])

  // Keep cards visually still when the extra lead window mounts or unmounts.
  useLayoutEffect(() => {
    if (lead > 0) {
      const offset = firstCardRef.current?.offsetLeft ?? 0
      leadOffsetRef.current = offset
      x.set(x.get() - offset)
    } else if (leadOffsetRef.current) {
      x.set(x.get() + leadOffsetRef.current)
      leadOffsetRef.current = 0
    }
  }, [lead, x])

  const rotateWindow = (direction: -1 | 1, carry: number) => {
    const nextStart = windowStartRef.current + direction * effectiveWindowSize
    windowStartRef.current = nextStart
    flushSync(() => setWindowStart(nextStart))

    const firstCard = firstCardRef.current
    const nextWindow = nextWindowRef.current
    const nextDistance = firstCard && nextWindow
      ? nextWindow.offsetLeft - firstCard.offsetLeft
      : 0
    loopDistanceRef.current = nextDistance

    return direction === 1 ? carry : -nextDistance + carry
  }

  const setTrackPosition = (position: number) => {
    if (renderAllItems || effectiveWindowSize <= 0) {
      x.set(0)
      return
    }

    let nextPosition = position
    for (let attempts = 0; attempts < 4; attempts += 1) {
      const distance = loopDistanceRef.current
      if (distance <= 0) break

      if (nextPosition <= -distance) {
        nextPosition = rotateWindow(1, nextPosition + distance)
        continue
      }
      if (nextPosition > 0) {
        nextPosition = rotateWindow(-1, nextPosition)
        continue
      }
      break
    }

    x.set(nextPosition)
  }

  // Re-attached each render so the listener always sees the current window.
  useEffect(() => {
    const marquee = marqueeRef.current
    if (!marquee || renderAllItems) return

    const onWheel = (event: WheelEvent) => {
      const horizontal = event.deltaX || (event.shiftKey ? event.deltaY : 0)
      // Leave vertical gestures alone so the page keeps scrolling over the marquee.
      if (!horizontal || Math.abs(event.deltaY) > Math.abs(event.deltaX) && !event.shiftKey) return

      event.preventDefault()
      if (expanded) {
        onCollapse?.()
        return
      }
      velocityRef.current = 0
      coastingRef.current = false
      const lineHeight = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1
      setTrackPosition(x.get() - horizontal * lineHeight)
    }

    // React's wheel prop is passive, which would ignore preventDefault and
    // let a horizontal swipe trigger the browser's back gesture.
    marquee.addEventListener('wheel', onWheel, { passive: false })
    return () => marquee.removeEventListener('wheel', onWheel)
  })

  useAnimationFrame((_time, delta) => {
    if (expanded) {
      velocityRef.current = 0
      return
    }
    if (!isInView || prefersReducedMotion || dragRef.current) return

    const loopDistance = loopDistanceRef.current
    if (loopDistance <= 0) return

    const target = focusedRef.current ? 0 : autoSpeed
    const next = advanceMarquee(velocityRef.current, target, Math.min(delta, 64) / 1000, coastingRef.current ? 0.5 : 0.22)
    velocityRef.current = next.velocity
    if (Math.abs(next.velocity - target) < 0.5) {
      velocityRef.current = target
      coastingRef.current = false
      if (target === 0) return
    }
    setTrackPosition(x.get() + next.distance)
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
      lastX: event.clientX,
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
      suppressClickRef.current = true
      if (expanded) {
        // Dragging an expanded group closes it instead of scrolling mid-layout.
        dragRef.current = null
        onCollapse?.()
        return
      }
      drag.active = true
      setIsDragging(true)
      // Capture only after dragging starts, so a normal click still reaches its link.
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    const movementX = drag.active ? event.clientX - drag.lastX : deltaX
    drag.lastX = event.clientX
    drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= 100)
    drag.samples.push({ x: event.clientX, time: event.timeStamp })
    setTrackPosition(x.get() + movementX)
  }

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
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
        'liked-work-marquee relative -my-2 w-full min-w-0 touch-pan-y select-none overflow-x-clip py-2 motion-reduce:cursor-auto motion-reduce:touch-auto motion-reduce:overflow-x-auto',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        expansion?.expandedPosition !== undefined && 'z-10',
      )}
      data-marquee-row={rowIndex}
      role="region"
      aria-label={label}
      onPointerLeave={() => {
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
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) {
          focusedRef.current = true
          setKeyboardExpanded(true)
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedRef.current = false
          setKeyboardExpanded(false)
        }
      }}
    >
      <motion.div
        className="liked-work-marquee-track relative"
        role="list"
        style={{ x }}
      >
        {mountedEntries.map(({ item, position }, index) => {
          const duplicate = !renderAllItems && (index < lead || index >= lead + effectiveWindowSize)
          const isExpanded = expansion?.expandedPosition === position
          const shift = !expansion
            ? 0
            : isExpanded
              ? expansion.expandedShift ?? 0
              : position < expansion.pivot
                ? expansion.leftShift
                : expansion.rightShift
          return (
            <div
              key={`${position}:${item.id}`}
              ref={index === lead ? firstCardRef : index === lead + effectiveWindowSize ? nextWindowRef : undefined}
              role={duplicate ? undefined : 'listitem'}
              aria-hidden={duplicate ? 'true' : undefined}
              data-marquee-slot
              data-position={position}
              className="relative shrink-0"
              style={{
                height: 'var(--liked-work-card-height)',
                width: `calc(var(--liked-work-card-height) * ${item.aspectRatio})`,
                translate: shift ? `${shift}px 0` : undefined,
                transition: SLOT_TRANSITION,
                zIndex: isExpanded ? 10 : undefined,
              }}
            >
              <WorkCard
                item={item}
                duplicate={duplicate}
                reduceMotion={Boolean(prefersReducedMotion)}
                loadMedia={shouldLoadMedia || keyboardExpanded}
                // The animated window is bounded; load its images before they
                // enter the clipped viewport instead of relying on native lazy loading.
                imageLoading={renderAllItems ? 'lazy' : 'eager'}
                rowIndex={rowIndex}
                expanded={isExpanded ? expansion?.expandedSize : undefined}
                onToggle={canExpand ? () => onToggleCard?.(rowIndex, position) : undefined}
              />
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

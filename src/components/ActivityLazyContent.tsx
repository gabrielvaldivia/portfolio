'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityVideoThumbnail } from '@/components/ActivityVideoThumbnail'
import { HighlighterFilledIcon } from '@/components/Icons'
import { PayloadImage } from '@/components/PayloadImage'
import { cn } from '@/lib/cn'
import { formatActivityTime } from '@/lib/activityTime'
import type {
  ModuleLikeActivityCursor,
  ModuleLikeActivityItem,
  ModuleLikeActivityPage,
} from '@/lib/moduleLikeActivity'
import {
  MODULE_LIKE_ACTIVITY_PAGE_SIZE,
} from '@/lib/moduleLikeActivityPagination'

const activityTimeZone = 'America/New_York'
const activityCalendarFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'numeric',
  timeZone: activityTimeZone,
  weekday: 'short',
  year: 'numeric',
})

const dayInMilliseconds = 24 * 60 * 60 * 1000
const weekdayIndexes: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

type ActivityDisplayItem = ModuleLikeActivityItem & {
  count: number
  mergeKey: string
}

type ActivityThumbnailValue = NonNullable<ModuleLikeActivityItem['target']['thumbnail']>
type ActivityCalendarDate = NonNullable<ReturnType<typeof getActivityCalendarDate>>

function getActivityCalendarDate(date: Date) {
  const parts = activityCalendarFormatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  const weekdayIndex = weekday ? weekdayIndexes[weekday] : undefined

  if (!year || !month || !day || weekdayIndex === undefined) return null

  const dayOrdinal = Math.floor(Date.UTC(year, month - 1, day) / dayInMilliseconds)

  return {
    day,
    dayOrdinal,
    month,
    weekStartOrdinal: dayOrdinal - weekdayIndex,
    year,
  }
}

function isSameActivityDay(first: ActivityCalendarDate, second: ActivityCalendarDate) {
  return first.dayOrdinal === second.dayOrdinal
}

function isSameActivityWeek(first: ActivityCalendarDate, second: ActivityCalendarDate) {
  return first.weekStartOrdinal === second.weekStartOrdinal
}

function isSameActivityMonth(first: ActivityCalendarDate, second: ActivityCalendarDate) {
  return first.year === second.year && first.month === second.month
}

function getActivitySectionTitle(value: string, now: Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Earlier'

  const activityDate = getActivityCalendarDate(date)
  const currentDate = getActivityCalendarDate(now)
  if (!activityDate || !currentDate) return 'Earlier'

  if (isSameActivityDay(activityDate, currentDate)) return 'Today'
  if (isSameActivityWeek(activityDate, currentDate)) return 'This Week'
  if (isSameActivityMonth(activityDate, currentDate)) return 'This Month'

  return 'Earlier'
}

function getActivityMergeKey(item: ModuleLikeActivityItem) {
  if (item.eventType === 'highlight') return item.id
  return [
    item.eventType,
    item.targetId,
    item.amount,
    item.location,
    item.city,
    item.region,
    item.country,
    item.target.href,
    item.target.sourceTitle,
    item.target.noun,
    item.target.thumbnail?.type || '',
    item.target.thumbnail?.url || '',
    item.target.thumbnail?.frame?.id || '',
  ].join('\u001f')
}

function mergeConsecutiveActivityItems(items: ModuleLikeActivityItem[]) {
  return items.reduce<ActivityDisplayItem[]>((mergedItems, item) => {
    const mergeKey = getActivityMergeKey(item)
    const previousItem = mergedItems[mergedItems.length - 1]

    if (previousItem?.mergeKey === mergeKey) {
      previousItem.count += 1
      return mergedItems
    }

    mergedItems.push({
      ...item,
      count: item.eventType === 'like' ? 1 : item.amount,
      mergeKey,
    })
    return mergedItems
  }, [])
}

function groupActivityItems(items: ActivityDisplayItem[], now: Date) {
  const groups = [
    { title: 'Today', items: [] as ActivityDisplayItem[] },
    { title: 'This Week', items: [] as ActivityDisplayItem[] },
    { title: 'This Month', items: [] as ActivityDisplayItem[] },
    { title: 'Earlier', items: [] as ActivityDisplayItem[] },
  ]

  items.forEach((item) => {
    const title = getActivitySectionTitle(item.createdAt, now)
    const group = groups.find((candidate) => candidate.title === title)
    group?.items.push(item)
  })

  return groups.filter((group) => group.items.length > 0)
}

function getLikePhrase(noun: string, isSuperlike: boolean) {
  const verb = isSuperlike ? 'superliked' : 'liked'
  return noun === 'image' ? `${verb} an ${noun}` : `${verb} a ${noun}`
}

function getActivitySentenceParts(item: ActivityDisplayItem) {
  const location = item.location
  if (item.eventType === 'highlight') {
    return {
      action: 'highlighted a passage',
      location, repetitions: '', source: item.target.sourceTitle,
    }
  }
  if (item.eventType === 'chat') {
    return {
      action: item.count > 1 ? `started ${item.count} chats` : 'started a chat',
      location,
      repetitions: '',
      source: '',
    }
  }

  const source = item.target.noun === 'photo' ? '' : item.target.sourceTitle
  const repetitions = item.count > 1 ? ` ${item.count} times` : ''
  const isSuperlike = item.amount > 1

  if (item.target.noun === 'note') {
    const verb = isSuperlike ? 'superliked' : 'liked'
    return {
      action: `${verb} the note`,
      location,
      repetitions,
      source: item.target.sourceTitle,
    }
  }

  return {
    action: getLikePhrase(item.target.noun, isSuperlike),
    location,
    repetitions,
    source,
  }
}

function getActivitySubject(item: ActivityDisplayItem) {
  if (item.eventType === 'highlight' && (item.highlightLocations?.length || 0) > 1) {
    return item.highlightLocations!.map((group, index) =>
      `${group.count > 1 ? `${group.count} readers` : index === 0 ? 'Someone' : 'someone'}${group.location ? ` from ${group.location}` : ''}`,
    ).join(' and ')
  }
  return item.eventType === 'highlight' && item.count > 1 ? `${item.count} readers` : 'Someone'
}

function getActivitySourcePrefix(item: ActivityDisplayItem) {
  return item.eventType === 'like' && item.target.noun === 'note' ? ' ' : ' in '
}

function getActivitySentence(item: ActivityDisplayItem) {
  const { action, location, repetitions, source } = getActivitySentenceParts(item)
  const locationText = location ? ` from ${location}` : ''
  const sourceText = source ? `${getActivitySourcePrefix(item)}${source}` : ''

  return `${getActivitySubject(item)}${locationText} ${action}${sourceText}${repetitions}${item.quote ? `: “${item.quote}”` : ''}`
}

function getCountryFlagUrl(country = '') {
  const code = country.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''

  const extension = code === 'SA' ? 'png' : 'svg'

  return `/flags/figma/${code.toLowerCase()}.${extension}`
}

function ActivityLocation({ location, country }: { location: string; country: string }) {
  const flagUrl = getCountryFlagUrl(country)
  return (
    <span className="font-medium text-text-strong">
      {flagUrl ? (
        <span aria-hidden="true" style={{ display: 'inline-block', height: '0.8em', marginLeft: '0.25em', marginRight: '0.25em', verticalAlign: '-0.05em' }}>
          <img src={flagUrl} alt="" loading="lazy" decoding="async" style={{ display: 'block', height: '100%', width: 'auto' }} />
        </span>
      ) : null}
      {location}
    </span>
  )
}

const activityLinkClassName = 'font-medium text-text-strong underline-offset-4 hover:underline focus-visible:underline'

function ActivitySentence({ item, nowMs }: { item: ActivityDisplayItem; nowMs: number }) {
  const { action, location, repetitions, source } = getActivitySentenceParts(item)
  const hasLink = item.target.href !== '#'

  return (
    <p className="text-body text-text-body">
      {item.eventType === 'highlight' && (item.highlightLocations?.length || 0) > 1 ? item.highlightLocations!.map((group, index) => (
        <Fragment key={group.location}>
          {index > 0 ? ' and ' : null}
          {group.count > 1 ? `${group.count} readers` : index === 0 ? 'Someone' : 'someone'}
          {group.location ? <> from <ActivityLocation location={group.location} country={group.country} /></> : null}
        </Fragment>
      )) : getActivitySubject(item)}
      {location ? (
        <>
          {' from '}
          <ActivityLocation location={location} country={item.country} />
        </>
      ) : null}
      {' '}{!source && hasLink ? <Link href={item.target.href} className={activityLinkClassName}>{action}</Link> : action}
      {source ? (
        <>
          {getActivitySourcePrefix(item)}
          {hasLink ? <Link href={item.target.href} className={activityLinkClassName}>{source}</Link> : <span className="font-medium text-text-strong">{source}</span>}
        </>
      ) : null}
      {repetitions}
      {' '}
      <span className="text-text-subtle tabular-nums">
        <span aria-hidden="true">· </span>
        <time dateTime={item.createdAt}>{formatActivityTime(item.createdAt, nowMs)}</time>
      </span>
    </p>
  )
}

function getThumbnailContainerStyle(thumbnail: ActivityThumbnailValue) {
  return {
    ...(thumbnail.backgroundColor ? { backgroundColor: thumbnail.backgroundColor } : {}),
    ...(thumbnail.padding ? { padding: thumbnail.padding } : {}),
  }
}

function getThumbnailMediaClassName(className: string, thumbnail: ActivityThumbnailValue) {
  return thumbnail.fit === 'contain'
    ? className.replace(/\bobject-cover\b/g, 'object-contain')
    : className
}

function ActivityFramedThumbnail({
  thumbnail,
  className,
  mediaClassName = 'block !h-full w-full object-cover object-center',
  playVideoOnHover = false,
}: {
  thumbnail: ActivityThumbnailValue
  className: string
  mediaClassName?: string
  playVideoOnHover?: boolean
}) {
  const frame = thumbnail.frame
  if (!frame) return null
  const resolvedMediaClassName = getThumbnailMediaClassName(mediaClassName, thumbnail)
  const isDC1Frame = frame.id === 'dc1'
  const paddingClassName = cn('px-1 tablet:px-1.5', isDC1Frame ? 'py-2 tablet:py-3' : 'py-1 tablet:py-1.5')
  const imageSizes = '80px'

  return (
    <div
      className={cn(
        className,
        'flex items-center justify-center',
        paddingClassName,
      )}
      aria-hidden="true"
    >
      <div
        className="relative h-full max-h-full max-w-full overflow-hidden"
        style={{ aspectRatio: frame.aspectRatio }}
      >
        <div
          className="absolute z-0 overflow-hidden bg-black"
          style={frame.screen}
        >
          {thumbnail.type === 'video' ? (
            <ActivityVideoThumbnail
              src={thumbnail.url}
              className={resolvedMediaClassName}
              playOnHover={playVideoOnHover}
            />
          ) : (
            <PayloadImage
              media={thumbnail}
              alt=""
              fill
              sizes={imageSizes}
              className={resolvedMediaClassName}
            />
          )}
        </div>
        <Image
          src={frame.url}
          alt=""
          fill
          unoptimized
          sizes={imageSizes}
          quality={90}
          className="z-10 object-contain pointer-events-none"
        />
      </div>
    </div>
  )
}

function ActivityMediaThumbnail({
  thumbnail,
  className,
  mediaClassName = 'block !h-full w-full object-cover object-center',
  playVideoOnHover = false,
}: {
  thumbnail: ActivityThumbnailValue | null
  className: string
  mediaClassName?: string
  playVideoOnHover?: boolean
}) {
  if (thumbnail?.frame) {
    return (
      <ActivityFramedThumbnail
        thumbnail={thumbnail}
        className={className}
        mediaClassName={mediaClassName}
        playVideoOnHover={playVideoOnHover}
      />
    )
  }

  if (thumbnail?.type === 'image') {
    const resolvedMediaClassName = getThumbnailMediaClassName(
      mediaClassName,
      thumbnail,
    )
    const containerStyle = getThumbnailContainerStyle(thumbnail)
    const imageClassName = cn(
      'relative h-full w-full',
      thumbnail.rounded || thumbnail.imageBorder ? 'overflow-hidden rounded-md' : '',
    )
    const border = thumbnail.imageBorder ? (
      <div className="pointer-events-none absolute inset-0 border border-border" />
    ) : null
    const imageSizes = '80px'

    if (
      thumbnail.padding
      && thumbnail.imageBorder
      && thumbnail.width
      && thumbnail.height
    ) {
      return (
        <div
          className={cn(className, 'flex items-center justify-center')}
          style={containerStyle}
          aria-hidden="true"
        >
          <PayloadImage
            media={thumbnail}
            alt=""
            width={thumbnail.width}
            height={thumbnail.height}
            sizes={imageSizes}
            className={cn(
              'block h-auto max-h-full w-auto max-w-full border border-border object-contain object-center',
              thumbnail.rounded ? 'rounded-md' : '',
            )}
          />
        </div>
      )
    }

    if (thumbnail.padding) {
      return (
        <div
          className={className}
          style={containerStyle}
          aria-hidden="true"
        >
          <div className={imageClassName}>
            <PayloadImage
              media={thumbnail}
              alt=""
              fill
              sizes={imageSizes}
              className={resolvedMediaClassName}
            />
            {border}
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(className, 'relative')}
        style={containerStyle}
        aria-hidden="true"
      >
        <PayloadImage
          media={thumbnail}
          alt=""
          fill
          sizes={imageSizes}
          className={resolvedMediaClassName}
        />
        {border}
      </div>
    )
  }

  if (thumbnail?.type === 'video') {
    const resolvedMediaClassName = getThumbnailMediaClassName(
      mediaClassName,
      thumbnail,
    )
    const media = (
      <ActivityVideoThumbnail
        src={thumbnail.url}
        className={resolvedMediaClassName}
        playOnHover={playVideoOnHover}
      />
    )

    if (thumbnail.padding) {
      return (
        <div
          className={className}
          style={getThumbnailContainerStyle(thumbnail)}
        >
          <div
            className={cn(
              'h-full w-full overflow-hidden',
              thumbnail.rounded || thumbnail.imageBorder ? 'rounded-md' : '',
              thumbnail.imageBorder ? 'border border-border' : '',
            )}
          >
            {media}
          </div>
        </div>
      )
    }

    return (
      <div
        className={className}
        style={getThumbnailContainerStyle(thumbnail)}
      >
        {media}
      </div>
    )
  }

  return <div className={cn(className, 'border-dashed')} aria-hidden="true" />
}

function ActivityThumbnail({ item }: { item: ActivityDisplayItem }) {
  return (
    <ActivityMediaThumbnail
      thumbnail={item.target.thumbnail}
      className="size-16 tablet:size-20 shrink-0 self-center overflow-hidden rounded-md border border-border bg-background-alt"
    />
  )
}

function ActivityText({ item, nowMs }: { item: ActivityDisplayItem; nowMs: number }) {
  return (
    <div className="min-w-0">
      <ActivitySentence item={item} nowMs={nowMs} />
      {item.quote ? (
        <blockquote className="mt-3 border-l-2 border-border-strong pl-4 text-body text-text-muted">
          <p className="line-clamp-3">{item.quote}</p>
        </blockquote>
      ) : null}
    </div>
  )
}

function ActivityIcon({ eventType }: { eventType: ActivityDisplayItem['eventType'] }) {
  return (
    <span className="flex h-lh items-center text-body" aria-hidden="true">
      {eventType === 'like' ? <Heart fill="currentColor" className="size-5 text-text-like tablet:size-6" /> : null}
      {eventType === 'highlight' ? <HighlighterFilledIcon className="size-5 text-text-highlight tablet:size-6" /> : null}
      {eventType === 'chat' ? <MessageCircle fill="currentColor" className="size-5 text-text-chat tablet:size-6" /> : null}
    </span>
  )
}

function ActivityRow({ item, nowMs, isFirst = false }: { item: ActivityDisplayItem; nowMs: number; isFirst?: boolean }) {
  const hasThumbnail = item.eventType !== 'chat' && Boolean(item.target.thumbnail)
  const rowClassName = cn(
    'relative grid items-start gap-3 py-4 tablet:gap-5 tablet:py-5',
    hasThumbnail ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[auto_minmax(0,1fr)]',
    !isFirst && 'before:absolute before:top-0 before:right-0 before:left-8 before:border-t before:border-border before:opacity-50 tablet:before:left-11',
  )
  return (
    <div className={rowClassName}>
      <ActivityIcon eventType={item.eventType} />
      <ActivityText item={item} nowMs={nowMs} />
      {hasThumbnail ? item.target.href !== '#' ? (
        <Link href={item.target.href} className="self-center" aria-label={getActivitySentence(item)}>
          <ActivityThumbnail item={item} />
        </Link>
      ) : <ActivityThumbnail item={item} /> : null}
    </div>
  )
}

function EmptyState({ unavailable = false }: { unavailable?: boolean }) {
  const message = unavailable ? 'Activity is temporarily unavailable.' : 'No activity yet.'

  return (
    <div className="border-t border-border py-6">
      <p className="text-body text-text-body">{message}</p>
      <Link href="/work" className="mt-4 inline-flex text-body transition-opacity duration-150 hover:opacity-60">
        Browse work
      </Link>
    </div>
  )
}

function LoadMoreControl({
  error,
  hasMore,
  loading,
  onLoadMore,
}: {
  error: string
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !hasMore || loading || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      onLoadMore()
    }, {
      rootMargin: '900px 0px',
    })
    observer.observe(root)

    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  if (!hasMore && !error) return null

  return (
    <div ref={rootRef} className="pt-8">
      {error ? <p className="pb-3 text-caption text-text-error">{error}</p> : null}
      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className="inline-flex cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-body transition-colors duration-150 hover:bg-background-alt disabled:cursor-default disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

async function fetchActivityPage(cursor: ModuleLikeActivityCursor) {
  const params = new URLSearchParams({
    view: 'activity',
    limit: String(MODULE_LIKE_ACTIVITY_PAGE_SIZE),
    cursorCreatedAt: cursor.createdAt,
    cursorId: cursor.id,
  })
  const response = await fetch(`/api/activity?${params}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load more activity.')
  return response.json() as Promise<ModuleLikeActivityPage>
}

function ActivityItems({
  initialCursor,
  initialItems,
  initialNow,
}: {
  initialCursor: ModuleLikeActivityCursor | null
  initialItems: ModuleLikeActivityItem[]
  initialNow: string
}) {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loadingRef = useRef(false)
  const now = useMemo(() => new Date(initialNow), [initialNow])
  const nowMs = now.getTime()
  const groups = useMemo(() => groupActivityItems(mergeConsecutiveActivityItems(items), now), [items, now])

  useEffect(() => {
    loadingRef.current = false
    setItems(initialItems)
    setCursor(initialCursor)
    setLoading(false)
    setError('')
  }, [initialCursor, initialItems])

  const loadMore = useCallback(() => {
    if (!cursor || loadingRef.current) return

    loadingRef.current = true
    setLoading(true)
    setError('')

    void fetchActivityPage(cursor)
      .then((page) => {
        setItems((currentItems) => {
          const seenIds = new Set(currentItems.map((item) => item.id))
          const nextItems = page.items.filter((item) => !seenIds.has(item.id))
          return [...currentItems, ...nextItems]
        })
        setCursor(page.nextCursor)
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Unable to load more activity.')
      })
      .finally(() => {
        loadingRef.current = false
        setLoading(false)
      })
  }, [cursor])

  return (
    <>
      {items.length > 0 ? (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.title}>
              <h4 className="mb-2 text-text-body">{group.title}</h4>
              <div>
                {group.items.map((item, index) => (
                  <ActivityRow key={item.id} item={item} nowMs={nowMs} isFirst={index === 0} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <LoadMoreControl
        error={error}
        hasMore={Boolean(cursor)}
        loading={loading}
        onLoadMore={loadMore}
      />
    </>
  )
}

export function ActivityLazyContent({
  initialActivityPage,
  initialNow,
  unavailable = false,
}: {
  initialActivityPage: ModuleLikeActivityPage
  initialNow: string
  unavailable?: boolean
}) {
  if (unavailable) return <EmptyState unavailable />

  return (
    <ActivityItems
      initialCursor={initialActivityPage.nextCursor}
      initialItems={initialActivityPage.items}
      initialNow={initialNow}
    />
  )
}

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ActivityVideoThumbnail } from '@/components/ActivityVideoThumbnail'
import { ActivityViewSwitcher, type ActivityView } from '@/components/ActivityViewSwitcher'
import { Container } from '@/components/Container'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { ModuleLightboxProvider, ModuleLightboxTrigger, type ModuleLightboxSlide } from '@/components/ModuleLightbox'
import { lightboxableBlockTypes } from '@/blocks/MediaBlockComponents'
import { cn } from '@/lib/cn'
import {
  getModuleLikeActivity,
  getModuleLikeFeed,
  type ModuleLikeActivityItem,
  type ModuleLikeFeedItem,
} from '@/lib/moduleLikeActivity'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity - Gabriel Valdivia',
  description: 'Recent and most-liked modules on Gabriel Valdivia portfolio projects and media.',
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const activityTimeZone = 'America/New_York'
const absoluteFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: activityTimeZone,
})
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

type ActivityPageSearchParams = {
  view?: string | string[]
}
type ActivityThumbnailValue = NonNullable<ModuleLikeActivityItem['target']['thumbnail']>
type ActivityCalendarDate = NonNullable<ReturnType<typeof getActivityCalendarDate>>

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getActivityView(searchParams: ActivityPageSearchParams): ActivityView {
  return getSearchParamValue(searchParams.view) === 'feed' ? 'feed' : 'activity'
}

function formatActivityTime(value: string) {
  const date = new Date(value)
  const elapsed = date.getTime() - Date.now()
  const absoluteElapsed = Math.abs(elapsed)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (Number.isNaN(date.getTime())) return ''
  if (absoluteElapsed < minute) return 'just now'
  if (absoluteElapsed < hour) return relativeFormatter.format(Math.round(elapsed / minute), 'minute')
  if (absoluteElapsed < day) return relativeFormatter.format(Math.round(elapsed / hour), 'hour')
  if (absoluteElapsed < 7 * day) return relativeFormatter.format(Math.round(elapsed / day), 'day')

  return absoluteFormatter.format(date)
}

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
  return [
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

    mergedItems.push({ ...item, count: 1, mergeKey })
    return mergedItems
  }, [])
}

function groupActivityItems(items: ActivityDisplayItem[]) {
  const now = new Date()
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
  const location = item.location ? ` from ${item.location}` : ''
  const source = item.target.sourceTitle
  const repetitions = item.count > 1 ? ` ${item.count} times` : ''
  const isSuperlike = item.amount > 1

  return {
    action: getLikePhrase(item.target.noun, isSuperlike),
    location,
    repetitions,
    source,
  }
}

function getActivitySentence(item: ActivityDisplayItem) {
  const { action, location, repetitions, source } = getActivitySentenceParts(item)
  const sourceText = source ? ` in ${source}` : ''

  return `Someone${location} ${action}${sourceText}${repetitions}`
}

function ActivitySentence({ item }: { item: ActivityDisplayItem }) {
  const { action, location, repetitions, source } = getActivitySentenceParts(item)

  return (
    <p className="text-body text-pretty">
      Someone{location} {action}
      {source ? (
        <>
          {' in '}
          <span className="font-medium">{source}</span>
        </>
      ) : null}
      {repetitions}
    </p>
  )
}

function getThumbnailContainerStyle(thumbnail: ActivityThumbnailValue) {
  return {
    ...(thumbnail.backgroundColor ? { backgroundColor: thumbnail.backgroundColor } : {}),
    ...(thumbnail.padding ? { padding: thumbnail.padding } : {}),
  }
}

function getThumbnailMediaClassName(className: string, thumbnail: ActivityThumbnailValue, preserveFit = true) {
  return preserveFit && thumbnail.fit === 'contain'
    ? className.replace(/\bobject-cover\b/g, 'object-contain')
    : className
}

function shouldPreserveThumbnailFit(thumbnail: ActivityThumbnailValue, forceMediaCover: boolean) {
  return !forceMediaCover || Boolean(thumbnail.padding)
}

function ActivityFramedThumbnail({
  thumbnail,
  className,
  mediaClassName = 'block !h-full w-full object-cover object-center',
  playVideoOnHover = false,
  paddingMode = 'compact',
}: {
  thumbnail: ActivityThumbnailValue
  className: string
  mediaClassName?: string
  playVideoOnHover?: boolean
  paddingMode?: 'compact' | 'feed'
}) {
  const frame = thumbnail.frame
  if (!frame) return null
  const resolvedMediaClassName = getThumbnailMediaClassName(mediaClassName, thumbnail)
  const isDC1Frame = frame.id === 'dc1'
  const paddingClassName = paddingMode === 'feed'
    ? isDC1Frame ? 'px-1.5 py-5 tablet:py-1.5' : 'p-1.5'
    : cn('px-1 tablet:px-1.5', isDC1Frame ? 'py-2 tablet:py-3' : 'py-1 tablet:py-1.5')
  const imageSizes = paddingMode === 'feed'
    ? '(max-width: 810px) 100vw, (max-width: 1280px) 50vw, 33vw'
    : '80px'

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
            <Image
              src={thumbnail.url}
              alt=""
              fill
              unoptimized
              sizes={imageSizes}
              quality={90}
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
  framedPaddingMode = 'compact',
  forceMediaCover = false,
}: {
  thumbnail: ActivityThumbnailValue | null
  className: string
  mediaClassName?: string
  playVideoOnHover?: boolean
  framedPaddingMode?: 'compact' | 'feed'
  forceMediaCover?: boolean
}) {
  if (thumbnail?.frame) {
    return (
      <ActivityFramedThumbnail
        thumbnail={thumbnail}
        className={className}
        mediaClassName={mediaClassName}
        playVideoOnHover={playVideoOnHover}
        paddingMode={framedPaddingMode}
      />
    )
  }

  if (thumbnail?.type === 'image') {
    const resolvedMediaClassName = getThumbnailMediaClassName(
      mediaClassName,
      thumbnail,
      shouldPreserveThumbnailFit(thumbnail, forceMediaCover),
    )
    const containerStyle = getThumbnailContainerStyle(thumbnail)
    const imageClassName = cn(
      'relative h-full w-full',
      thumbnail.rounded || thumbnail.imageBorder ? 'overflow-hidden rounded-md' : '',
    )
    const border = thumbnail.imageBorder ? (
      <div className="pointer-events-none absolute inset-0 border border-border" />
    ) : null
    const imageSizes = framedPaddingMode === 'feed'
      ? '(max-width: 810px) 100vw, (max-width: 1280px) 50vw, 33vw'
      : '80px'

    if (thumbnail.padding) {
      return (
        <div
          className={className}
          style={containerStyle}
          aria-hidden="true"
        >
          <div className={imageClassName}>
            <Image
              src={thumbnail.url}
              alt=""
              fill
              unoptimized
              sizes={imageSizes}
              quality={90}
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
        <Image
          src={thumbnail.url}
          alt=""
          fill
          unoptimized
          sizes={imageSizes}
          quality={90}
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
      shouldPreserveThumbnailFit(thumbnail, forceMediaCover),
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
      className="size-16 tablet:size-20 shrink-0 overflow-hidden rounded-md border border-border bg-background-alt"
    />
  )
}

function ActivityText({ item }: { item: ActivityDisplayItem }) {
  const timeLabel = formatActivityTime(item.createdAt)

  return (
    <div className="min-w-0">
      <ActivitySentence item={item} />
      <p className="pt-2 truncate text-caption text-muted tabular-nums">
        <time dateTime={item.createdAt}>{timeLabel}</time>
      </p>
    </div>
  )
}

function ActivityRow({ item, isFirst = false }: { item: ActivityDisplayItem; isFirst?: boolean }) {
  const rowClassName = cn(
    'group grid grid-cols-[1fr_auto] items-center gap-5 py-4 transition-opacity duration-150 tablet:py-5 tablet:hover:opacity-60',
    !isFirst && 'border-t border-border',
  )
  const content = (
    <>
      <ActivityText item={item} />
      <ActivityThumbnail item={item} />
    </>
  )

  if (item.target.href === '#') {
    return <div className={rowClassName}>{content}</div>
  }

  return (
    <Link href={item.target.href} className={rowClassName} aria-label={getActivitySentence(item)}>
      {content}
    </Link>
  )
}

function getLikeCountLabel(count: number) {
  return `${count} ${count === 1 ? 'like' : 'likes'}`
}

function getFeedItemLabel(item: ModuleLikeFeedItem, rank: number) {
  return `#${rank}. ${item.target.label}. ${getLikeCountLabel(item.likeCount)}`
}

function getFeedSlideId(item: ModuleLikeFeedItem) {
  return `activity-feed:${item.targetId}`
}

function getFeedLightboxSlides(items: ModuleLikeFeedItem[]): ModuleLightboxSlide[] {
  const slidesById = new Map<string, ModuleLightboxSlide>()

  items.forEach((item) => {
    const block = item.target.block
    if (!block || !lightboxableBlockTypes.includes(block.blockType)) return

    slidesById.set(getFeedSlideId(item), {
      id: getFeedSlideId(item),
      type: 'module',
      block,
      label: `Open ${item.target.label} fullscreen`,
      likeTargetId: item.targetId,
      movableSurface: false,
    })
  })

  return Array.from(slidesById.values())
}

function FeedItem({ item, rank }: { item: ModuleLikeFeedItem; rank: number }) {
  const thumbnail = (
    <ActivityMediaThumbnail
      thumbnail={item.target.thumbnail}
      className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-background-alt"
      framedPaddingMode="feed"
      forceMediaCover
      playVideoOnHover
    />
  )
  const canOpenLightbox = Boolean(item.target.block && lightboxableBlockTypes.includes(item.target.block.blockType))

  const media = canOpenLightbox ? (
    <ModuleLightboxTrigger
      slideId={getFeedSlideId(item)}
      label={getFeedItemLabel(item, rank)}
    >
      {thumbnail}
    </ModuleLightboxTrigger>
  ) : item.target.href === '#' ? (
    thumbnail
  ) : (
    <Link
      href={item.target.href}
      className="block"
      aria-label={getFeedItemLabel(item, rank)}
    >
      {thumbnail}
    </Link>
  )

  return (
    <div className="group/feed relative">
      {media}
      <div className="absolute bottom-3 left-3 z-20 opacity-100 transition-opacity duration-150 desktop:pointer-events-none desktop:opacity-0 desktop:group-hover/feed:pointer-events-auto desktop:group-hover/feed:opacity-100 desktop:group-focus-within/feed:pointer-events-auto desktop:group-focus-within/feed:opacity-100">
        <LazyModuleLikeButton targetId={item.targetId} initialCount={item.likeCount} />
      </div>
    </div>
  )
}

function FeedGrid({ items }: { items: ModuleLikeFeedItem[] }) {
  const slides = getFeedLightboxSlides(items)
  const grid = (
    <div className="grid grid-cols-1 gap-x-5 gap-y-5 tablet:grid-cols-2 tablet:gap-y-10 desktop:grid-cols-3">
      {items.map((item, index) => (
        <FeedItem key={item.id} item={item} rank={index + 1} />
      ))}
    </div>
  )

  if (slides.length === 0) return grid

  return (
    <ModuleLightboxProvider slides={slides}>
      {grid}
    </ModuleLightboxProvider>
  )
}

function EmptyState({ view, unavailable = false }: { view: ActivityView; unavailable?: boolean }) {
  const message = unavailable
    ? view === 'feed' ? 'Feed is temporarily unavailable.' : 'Activity is temporarily unavailable.'
    : view === 'feed' ? 'No liked images yet.' : 'No likes yet.'

  return (
    <div className="border-t border-border py-6">
      <p className="text-body text-muted text-pretty">{message}</p>
      <Link href="/work" className="mt-4 inline-flex text-body transition-opacity duration-150 hover:opacity-60">
        Browse work
      </Link>
    </div>
  )
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<ActivityPageSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const view = getActivityView(resolvedSearchParams)
  let rawItems: ModuleLikeActivityItem[] = []
  let feedItems: ModuleLikeFeedItem[] = []
  let unavailable = false

  try {
    if (view === 'feed') {
      feedItems = await getModuleLikeFeed(100)
    } else {
      rawItems = await getModuleLikeActivity(100)
    }
  } catch (error) {
    console.error('Activity data unavailable.', error)
    unavailable = true
  }

  const items = mergeConsecutiveActivityItems(rawItems)
  const groups = groupActivityItems(items)
  const content = view === 'activity'
    ? rawItems.length > 0 ? (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.title}>
              <h4 className="mb-2 text-muted">{group.title}</h4>
              <div>
                {group.items.map((item, index) => (
                  <ActivityRow key={item.id} item={item} isFirst={index === 0} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState view="activity" unavailable={unavailable} />
      )
    : feedItems.length > 0 ? (
        <FeedGrid items={feedItems} />
      ) : (
        <EmptyState view="feed" unavailable={unavailable} />
      )

  return (
    <section className="pb-20">
      <Container>
        <ActivityViewSwitcher
          view={view}
        >
          {content}
        </ActivityViewSwitcher>
      </Container>
    </section>
  )
}

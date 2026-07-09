import type { Metadata } from 'next'
import Link from 'next/link'
import { ActivityVideoThumbnail } from '@/components/ActivityVideoThumbnail'
import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { cn } from '@/lib/cn'
import { getModuleLikeActivity, type ModuleLikeActivityItem } from '@/lib/moduleLikeActivity'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity - Gabriel Valdivia',
  description: 'Recent likes on Gabriel Valdivia portfolio projects and media.',
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const absoluteFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

type ActivityDisplayItem = ModuleLikeActivityItem & {
  count: number
  mergeKey: string
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

function startOfDay(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

function startOfWeek(date: Date) {
  const start = startOfDay(date)
  start.setDate(start.getDate() - start.getDay())
  return start
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getActivitySectionTitle(value: string, now: Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Earlier'

  if (date >= startOfDay(now)) return 'Today'
  if (date >= startOfWeek(now)) return 'This Week'
  if (date >= startOfMonth(now)) return 'This Month'

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

function getThumbnailBackgroundImage(url: string) {
  return `url(${JSON.stringify(url)})`
}

function ActivityFramedThumbnail({
  thumbnail,
  className,
}: {
  thumbnail: NonNullable<ActivityDisplayItem['target']['thumbnail']>
  className: string
}) {
  const frame = thumbnail.frame
  if (!frame) return null

  const mediaClassName = 'block h-full w-full object-cover'

  return (
    <div className={cn(className, 'flex items-center justify-center p-1 tablet:p-1.5')} aria-hidden="true">
      <div
        className="relative h-full max-h-full overflow-hidden"
        style={{ aspectRatio: frame.aspectRatio }}
      >
        <div
          className="absolute z-0 overflow-hidden bg-black"
          style={frame.screen}
        >
          {thumbnail.type === 'video' ? (
            <ActivityVideoThumbnail
              src={thumbnail.url}
              className={mediaClassName}
            />
          ) : (
            <img
              src={thumbnail.url}
              alt=""
              loading="lazy"
              className={mediaClassName}
            />
          )}
        </div>
        <img
          src={frame.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 z-10 block h-full w-full object-contain pointer-events-none"
        />
      </div>
    </div>
  )
}

function ActivityThumbnail({ item }: { item: ActivityDisplayItem }) {
  const thumbnail = item.target.thumbnail
  const className = 'size-16 tablet:size-20 shrink-0 overflow-hidden rounded-md border border-border bg-background-alt'

  if (thumbnail?.frame) {
    return <ActivityFramedThumbnail thumbnail={thumbnail} className={className} />
  }

  if (thumbnail?.type === 'image') {
    return (
      <div
        className={cn(className, 'bg-cover bg-center')}
        style={{ backgroundImage: getThumbnailBackgroundImage(thumbnail.url) }}
        aria-hidden="true"
      />
    )
  }

  if (thumbnail?.type === 'video') {
    return (
      <div className={className}>
        <ActivityVideoThumbnail
          src={thumbnail.url}
          className="block h-full w-full object-cover"
        />
      </div>
    )
  }

  return <div className={cn(className, 'border-dashed')} aria-hidden="true" />
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

export default async function ActivityPage() {
  const rawItems = await getModuleLikeActivity(100)
  const items = mergeConsecutiveActivityItems(rawItems)
  const groups = groupActivityItems(items)

  return (
    <section className="pb-20">
      <Container>
        <div className="pb-20">
          <h1 className="text-balance text-[34px] tablet:hidden">Activity</h1>
          <div className="hidden tablet:block">
            <FitText className="font-heading" maxSize={120}>Activity</FitText>
          </div>
        </div>

        {rawItems.length > 0 ? (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-muted">{group.title}</h3>
                <div>
                  {group.items.map((item, index) => (
                    <ActivityRow key={item.id} item={item} isFirst={index === 0} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="border-t border-border py-6">
            <p className="text-body text-muted text-pretty">No likes yet.</p>
            <Link href="/work" className="mt-4 inline-flex text-body transition-opacity duration-150 hover:opacity-60">
              Browse work
            </Link>
          </div>
        )}
      </Container>
    </section>
  )
}

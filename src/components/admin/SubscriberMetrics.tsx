import type { BeforeListTableServerProps } from 'payload'

const dayMs = 24 * 60 * 60 * 1000
const recentWindowDays = 30
const trendWeeks = 12

type TrendPoint = { label: string; value: number }

type Metric = {
  delta?: number
  label: string
  lowerIsBetter?: boolean
  trend?: { caption: string; points: TrendPoint[]; unit: string }
  value: number
}

const sparkWidth = 240
const sparkHeight = 40
const sparkInset = 4

function formatWeek(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function formatDelta(delta: number) {
  if (delta === 0) return '0'
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')}`
}

function deltaTone(delta: number, lowerIsBetter = false) {
  if (delta === 0) return 'flat'
  return delta > 0 !== lowerIsBetter ? 'good' : 'bad'
}

function Sparkline({ caption, points, unit }: NonNullable<Metric['trend']>) {
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const step = (sparkWidth - sparkInset * 2) / (points.length - 1)
  const coords = points.map((point, index) => ({
    ...point,
    x: sparkInset + index * step,
    y: sparkInset + (1 - (point.value - min) / range) * (sparkHeight - sparkInset * 2),
  }))
  const first = coords[0]
  const last = coords[coords.length - 1]

  return (
    <figure className="subscriber-metrics__trend">
      <svg
        aria-label={`${caption}: from ${first.value} ${unit} the week ending ${first.label} to ${last.value} the week ending ${last.label}`}
        className="subscriber-metrics__sparkline"
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
      >
        <polyline
          className="subscriber-metrics__line"
          points={coords.map(({ x, y }) => `${x},${y}`).join(' ')}
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((point) => (
          <rect height={sparkHeight} key={point.label} opacity={0} width={step} x={point.x - step / 2} y={0}>
            <title>{`Week ending ${point.label}: ${point.value.toLocaleString('en-US')} ${unit}`}</title>
          </rect>
        ))}
      </svg>
    </figure>
  )
}

export async function SubscriberMetrics({ payload }: BeforeListTableServerProps) {
  const now = Date.now()
  const count = (where: Parameters<typeof payload.count>[0]['where']) =>
    payload.count({ collection: 'note-subscribers', overrideAccess: true, where }).then((result) => result.totalDocs)

  const [subscribed, pending, confirmed] = await Promise.all([
    count({ status: { equals: 'subscribed' } }),
    count({ status: { equals: 'pending' } }),
    payload.find({
      collection: 'note-subscribers',
      depth: 0,
      overrideAccess: true,
      pagination: false,
      select: { confirmedAt: true, unsubscribedAt: true },
      where: { status: { in: ['subscribed', 'unsubscribed'] } },
    }),
  ])

  // Rebuild weekly history from confirmation and unsubscribe dates; pending has no history to rebuild.
  // Imported subscribers have no confirmation date, so they count as subscribed from the start.
  // Generated Payload types are not committed, so CI sees selected fields as unknown.
  const spans = (confirmed.docs as { confirmedAt?: string | null; unsubscribedAt?: string | null }[]).map((doc) => ({
    start: doc.confirmedAt ? Date.parse(doc.confirmedAt) : -Infinity,
    end: doc.unsubscribedAt ? Date.parse(doc.unsubscribedAt) : Infinity,
  }))
  const weekEnds = Array.from({ length: trendWeeks }, (_, index) => now - (trendWeeks - 1 - index) * 7 * dayMs)
  const activeTrend = weekEnds.map((end) => ({
    label: formatWeek(new Date(end)),
    value: spans.filter((span) => span.start <= end && span.end > end).length,
  }))
  const canceledBetween = (from: number, to: number) => spans.filter((span) => span.end > from && span.end <= to).length
  const cancelationTrend = weekEnds.map((end) => ({
    label: formatWeek(new Date(end)),
    value: canceledBetween(end - 7 * dayMs, end),
  }))
  const windowMs = recentWindowDays * dayMs
  const recentCancelations = canceledBetween(now - windowMs, now)
  const previousCancelations = canceledBetween(now - 2 * windowMs, now - windowMs)
  const subscribedBefore = spans.filter((span) => span.start <= now - windowMs && span.end > now - windowMs).length

  const metrics: Metric[] = [
    {
      delta: subscribed - subscribedBefore,
      label: 'Subscribed',
      trend: { caption: `Last ${trendWeeks} weeks`, points: activeTrend, unit: 'subscribed' },
      value: subscribed,
    },
    {
      delta: recentCancelations - previousCancelations,
      label: 'Cancelations',
      lowerIsBetter: true,
      trend: { caption: `Per week, last ${trendWeeks} weeks`, points: cancelationTrend, unit: 'canceled' },
      value: recentCancelations,
    },
    { label: 'Pending', value: pending },
  ]

  return (
    <dl className="subscriber-metrics">
      {metrics.map((metric) => (
        <div className="subscriber-metrics__item" key={metric.label}>
          <dt className="subscriber-metrics__label">{metric.label}</dt>
          <dd className="subscriber-metrics__value">{metric.value.toLocaleString('en-US')}</dd>
          {metric.trend ? (
            <dd className="subscriber-metrics__trend-wrap">
              <Sparkline {...metric.trend} />
            </dd>
          ) : null}
          {metric.delta === undefined ? null : (
            <dd
              className={`subscriber-metrics__delta subscriber-metrics__delta--${deltaTone(metric.delta, metric.lowerIsBetter)}`}
              title={`vs the previous ${recentWindowDays} days`}
            >
              {formatDelta(metric.delta)}
              <span className="subscriber-metrics__sr"> vs the previous {recentWindowDays} days</span>
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}

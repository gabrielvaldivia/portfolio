'use client'

import type { PublicHighlight } from '@/lib/noteHighlightAnchors'
import { formatHighlightDate, getHighlightAttributionHeading, groupHighlightAttributions } from '@/lib/noteHighlightAttribution'

export function HighlightAttributionDetails({ highlight }: { highlight: PublicHighlight }) {
  const attributions = highlight.attributions || []
  if (!attributions.length) return <p>{getHighlightAttributionHeading(highlight)}</p>

  return (
    <div className="space-y-2">
      {groupHighlightAttributions(attributions).map((group) => (
        <p key={group.location === null ? 'unknown' : `location:${group.location}`}>
          Highlighted by {group.count === 1 ? 'someone' : `${group.count} people`}{group.location ? ` from ${group.location}` : ''} on{' '}
          {group.dates.map((date, index) => (
            <span key={date.createdAt}>
              {index > 0 ? index === group.dates.length - 1 ? ' and ' : '; ' : null}
              <time dateTime={date.createdAt}>{formatHighlightDate(date.createdAt)}</time>
            </span>
          ))}.
        </p>
      ))}
    </div>
  )
}

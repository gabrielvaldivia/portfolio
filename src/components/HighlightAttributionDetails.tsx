'use client'

import type { PublicHighlight } from '@/lib/noteHighlightAnchors'
import { formatHighlightDate, groupHighlightAttributions } from '@/lib/noteHighlightAttribution'

export function HighlightAttributionDetails({ highlight }: { highlight: PublicHighlight }) {
  const attributions = highlight.attributions || []
  if (!attributions.length) return null
  if (highlight.count === 1) {
    return <time className="text-sm text-muted" dateTime={attributions[0].createdAt}>{formatHighlightDate(attributions[0].createdAt)}</time>
  }

  return (
    <ul className="space-y-3 text-sm">
      {groupHighlightAttributions(attributions).map((group) => (
        <li key={group.location === null ? 'unknown' : `location:${group.location}`}>
          <p>{group.location ? `${group.count} from ${group.location}` : `${group.count} ${group.count === 1 ? 'person' : 'people'} · location unavailable`}</p>
          <ul className="mt-1 space-y-1 text-muted">
            {group.dates.map((date) => (
              <li key={date.createdAt}>
                <time dateTime={date.createdAt}>{formatHighlightDate(date.createdAt)}</time>
                {date.count > 1 ? ` · ${date.count} people` : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

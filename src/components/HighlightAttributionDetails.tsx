'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { PublicHighlight } from '@/lib/noteHighlightAnchors'
import { formatHighlightDate, getHighlightAttributionHeading } from '@/lib/noteHighlightAttribution'

export function HighlightAttributionDetails({ highlight }: { highlight: PublicHighlight }) {
  const [readerIndex, setReaderIndex] = useState(0)
  const attributions = highlight.attributions || []
  if (!attributions.length) return <p>{getHighlightAttributionHeading(highlight)}</p>
  const index = readerIndex % attributions.length
  const attribution = attributions[index]
  const multiple = attributions.length > 1

  return (
    <div className="flex items-center gap-2">
      <p className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
        {multiple ? <span className="sr-only">Reader {index + 1} of {attributions.length}. </span> : null}
        Highlighted by someone{attribution.location ? ` from ${attribution.location}` : ''} on{' '}
        <time dateTime={attribution.createdAt}>{formatHighlightDate(attribution.createdAt)}</time>.
      </p>
      {multiple ? (
        <button type="button" aria-label="Next reader" onClick={() => setReaderIndex((current) => (current + 1) % attributions.length)}
          className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

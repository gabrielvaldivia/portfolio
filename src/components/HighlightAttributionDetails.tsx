'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { PublicHighlight } from '@/lib/noteHighlightAnchors'
import { formatHighlightDate, getHighlightAttributionHeading } from '@/lib/noteHighlightAttribution'

export function HighlightAttributionDetails({ highlight, onRemove, removing = false, error }: {
  highlight: PublicHighlight
  onRemove?: () => void
  removing?: boolean
  error?: string
}) {
  const [readerIndex, setReaderIndex] = useState(0)
  const attributions = highlight.attributions || []
  if (!attributions.length) return <p>{getHighlightAttributionHeading(highlight)}</p>
  const index = readerIndex % attributions.length
  const attribution = attributions[index]
  const multiple = attributions.length > 1
  const canRemove = onRemove && (attribution.mine || (!multiple && highlight.mine))

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
          {multiple ? <span className="sr-only">Reader {index + 1} of {attributions.length}. </span> : null}
          Highlighted by someone{attribution.location ? ` from ${attribution.location}` : ''} on{' '}
          <time dateTime={attribution.createdAt}>{formatHighlightDate(attribution.createdAt)}</time>.
          {canRemove ? (
            <>{' '}<button type="button" onClick={onRemove} disabled={removing} aria-label="Remove your highlight"
              className="ml-1 inline-block text-text-inverse-muted underline underline-offset-2 transition-colors hover:text-inverse disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
              {removing ? 'Removing…' : 'Remove'}
            </button></>
          ) : null}
        </p>
        {multiple ? (
          <button type="button" aria-label="Next reader" disabled={removing} onClick={() => setReaderIndex((current) => (current + 1) % attributions.length)}
            className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text-inverse-muted hover:text-inverse focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-current">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-2">{error}</p> : null}
    </div>
  )
}

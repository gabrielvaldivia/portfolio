'use client'

import { useRowLabel } from '@payloadcms/ui'

export function TimelineChapterRowLabel() {
  const { data, rowNumber } = useRowLabel<{ title?: string }>()
  const chapterLabel = rowNumber === 0 ? 'Prologue' : `Chapter ${rowNumber}`

  return (
    <span>
      {chapterLabel}
      {data?.title ? ` — ${data.title}` : ''}
    </span>
  )
}

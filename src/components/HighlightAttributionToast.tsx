'use client'

import { useEffect, useState, type RefObject } from 'react'
import { toast } from 'sonner'
import { HighlightAttributionDetails } from '@/components/HighlightAttributionDetails'
import type { PublicHighlight } from '@/lib/noteHighlightAnchors'

export function HighlightAttributionToast({ id, highlight, hovered, panelRef, onRemove, removing, onDismiss }: {
  id: string
  highlight: PublicHighlight | null
  hovered: boolean
  panelRef: RefObject<HTMLDivElement | null>
  onRemove: () => void
  removing: boolean
  onDismiss: () => void
}) {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!highlight) {
      toast.dismiss(id)
      setFocused(false)
      return
    }

    toast(
      <div ref={panelRef} role="group" aria-label="Highlight attribution" className="w-full text-left text-sm font-normal leading-relaxed text-pretty"
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}>
        <HighlightAttributionDetails key={highlight.id} highlight={highlight} onRemove={onRemove} removing={removing} />
      </div>,
      {
        id,
        duration: hovered || removing || focused ? Infinity : 8000,
        dismissible: !removing,
        closeButton: false,
        onDismiss,
        onAutoClose: onDismiss,
      },
    )
  }, [id, highlight, hovered, panelRef, onRemove, removing, focused, onDismiss])

  useEffect(() => () => { toast.dismiss(id) }, [id])

  return null
}

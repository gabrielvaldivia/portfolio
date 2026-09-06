'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Highlighter } from 'lucide-react'
import { LazyModuleLikeButton, ModuleLikeButtonShell } from '@/components/LazyModuleLikeButton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import type { PublicHighlight } from '@/lib/noteHighlightAnchors'

type NoteActionsProps = {
  noteId: string
  likeTargetId: string
  visitorReady: boolean
  highlights: PublicHighlight[]
  highlightsReady: boolean
  error: string
  onSelectHighlight: (highlight: PublicHighlight) => void
  onRefreshHighlights: () => void
  onOpenHighlights: () => void
}

function NoteViews({ noteId, enabled }: { noteId: string; enabled: boolean }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    let disposed = false
    let requested = false
    const recordView = async () => {
      if (requested || document.visibilityState !== 'visible') return
      requested = true
      try {
        // The server deduplicates concurrent requests and reloads per browser/day.
        const response = await fetch(`/api/notes/views?noteId=${encodeURIComponent(noteId)}`, { method: 'POST', cache: 'no-store' })
        const data = await response.json()
        if (response.ok && Number.isSafeInteger(data.count) && data.count >= 0) {
          if (!disposed) setCount(data.count)
        }
      } catch { /* Unavailable counts stay a dash rather than a fabricated zero. */ }
    }
    void recordView()
    document.addEventListener('visibilitychange', recordView)
    return () => { disposed = true; document.removeEventListener('visibilitychange', recordView) }
  }, [noteId, enabled])

  return (
    <span role="img" className="inline-flex h-11 min-w-16 items-center justify-center gap-1.5 px-3 text-sm font-medium text-muted"
      aria-label={count === null ? 'Views unavailable' : `${count.toLocaleString('en-US')} ${count === 1 ? 'view' : 'views'}`}
      title="Views since launch. Each browser counts once per day.">
      <Eye className="size-[18px]" aria-hidden="true" />
      <span className="tabular-nums" aria-hidden="true">{count === null ? '—' : count.toLocaleString('en-US', { notation: 'compact' })}</span>
    </span>
  )
}

export function NoteActions({ noteId, likeTargetId, visitorReady, highlights, highlightsReady, error, onSelectHighlight, onRefreshHighlights, onOpenHighlights }: NoteActionsProps) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  // Portal out of the page-transition transform so fixed means viewport-fixed.
  return createPortal(
    <div data-note-actions className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div role="group" aria-label="Note activity" className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-border bg-elevated p-1.5 shadow-lg">
        {visitorReady
          ? <LazyModuleLikeButton targetId={likeTargetId} noun="note" variant="pill" />
          : <ModuleLikeButtonShell noun="note" variant="pill" />}
        <Popover open={open} onOpenChange={(next) => {
          setOpen(next)
          if (next) { onOpenHighlights(); onRefreshHighlights() }
        }}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={highlightsReady ? `${highlights.length} highlighted passages. Show highlights` : 'Show highlights'}
              className="inline-flex h-11 min-w-16 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-background-alt hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content">
              <Highlighter className="size-[18px]" aria-hidden="true" />
              <span className="tabular-nums" aria-hidden="true">{highlightsReady ? highlights.length : '—'}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" sideOffset={14} collisionPadding={16} aria-label="Highlighted passages"
            className="z-50 flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-border bg-elevated text-sm text-content shadow-lg outline-none">
            <p className="shrink-0 px-5 py-4 text-sm font-medium">Highlights</p>
            {error && !highlightsReady ? (
              <div className="px-5 pb-4">
                <p role="alert">{error}</p>
                <button type="button" onClick={onRefreshHighlights} className="mt-2 min-h-11 underline">Try again</button>
              </div>
            ) : !highlightsReady ? <p role="status" className="px-5 pb-5 text-muted">Loading highlights…</p>
              : highlights.length === 0 ? <p className="px-5 pb-5 text-muted">No highlights yet.</p>
              : <ul className="min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
                {highlights.map((highlight) => (
                  <li key={highlight.id}>
                    <button type="button" className="block min-h-11 w-full rounded-lg px-3 py-3 text-left text-sm leading-relaxed hover:bg-background-alt focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-content"
                      onClick={() => { setOpen(false); onSelectHighlight(highlight) }}>
                      “{highlight.exact}”
                    </button>
                  </li>
                ))}
              </ul>}
          </PopoverContent>
        </Popover>
        <NoteViews key={noteId} noteId={noteId} enabled={visitorReady} />
      </div>
    </div>, document.body,
  )
}

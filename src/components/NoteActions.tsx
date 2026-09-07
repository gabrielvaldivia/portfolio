'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Eye, Highlighter } from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import { LazyModuleLikeButton, ModuleLikeButtonShell } from '@/components/LazyModuleLikeButton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { PublicHighlight } from '@/lib/noteHighlightAnchors'
import { cn } from '@/lib/cn'

const mobileQuery = '(max-width: 809px)'
function subscribeMobile(onChange: () => void) {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches
const getServerMobileSnapshot = () => false

type NoteActionsProps = {
  noteId: string
  likeTargetId: string
  visitorReady: boolean
  highlights: PublicHighlight[]
  highlightsReady: boolean
  highlightsVisible: boolean
  onHighlightsVisibleChange: (visible: boolean) => void
  error: string
  onSelectHighlight: (highlight: PublicHighlight) => void
  onRefreshHighlights: () => void
  onOpenHighlights: () => void
}

function NoteViews({ noteId, enabled }: { noteId: string; enabled: boolean }) {
  const [count, setCount] = useState<number | null>(null)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipId = useId()

  useEffect(() => {
    if (!tooltipOpen) return
    const timer = setTimeout(() => setTooltipOpen(false), 2000)
    return () => clearTimeout(timer)
  }, [tooltipOpen])

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
    <Popover open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <PopoverTrigger asChild>
        <button type="button" data-note-views
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-background-alt hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
          aria-label={count === null ? 'Views unavailable' : `${count.toLocaleString('en-US')} ${count === 1 ? 'view' : 'views'}`}
          aria-describedby={tooltipOpen ? tooltipId : undefined} aria-controls={tooltipOpen ? tooltipId : undefined} aria-haspopup={undefined}>
          <Eye className="size-[18px]" aria-hidden="true" />
          <span className="tabular-nums" aria-hidden="true">{count === null ? '—' : count.toLocaleString('en-US', { notation: 'compact' })}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent id={tooltipId} role="tooltip" side="top" sideOffset={10} collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="note-views-tooltip z-50 rounded-xl bg-content px-3 py-2 text-center text-sm font-medium text-inverse shadow-sm outline-none">
        Views
      </PopoverContent>
    </Popover>
  )
}

export function NoteActions({ noteId, likeTargetId, visitorReady, highlights, highlightsReady, highlightsVisible, onHighlightsVisibleChange, error, onSelectHighlight, onRefreshHighlights, onOpenHighlights }: NoteActionsProps) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const mobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerMobileSnapshot)
  const pendingSelection = useRef<PublicHighlight | null>(null)
  const skipRestoreFocus = useRef(false)

  function changeOpen(next: boolean) {
    setOpen(next)
    if (next) {
      skipRestoreFocus.current = false
      onOpenHighlights()
      onRefreshHighlights()
    }
  }

  function finishSelection() {
    const highlight = pendingSelection.current
    pendingSelection.current = null
    // Wait until the modal's scroll lock has been removed before jumping.
    if (highlight) requestAnimationFrame(() => onSelectHighlight(highlight))
  }

  const trigger = (
    <button type="button" aria-label={highlightsReady ? `${highlights.length} highlighted passages. Show highlights` : 'Show highlights'}
      className="inline-grid h-11 min-w-11 grid-cols-[18px_minmax(1ch,auto)] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-background-alt hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content">
      <Highlighter className={cn('col-start-1 row-start-1 size-[18px]', highlightsReady && highlights.length === 0 && 'col-span-2 justify-self-center')} aria-hidden="true" />
      <span className={cn('col-start-2 row-start-1 min-w-[1ch] text-left tabular-nums', highlightsReady && highlights.length === 0 && 'invisible')} aria-hidden="true">{highlightsReady ? highlights.length : '—'}</span>
    </button>
  )
  const visibilitySwitch = (
    <Switch.Root checked={highlightsVisible} onCheckedChange={onHighlightsVisibleChange} aria-label="Show highlights"
      className="group flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content">
      <span aria-hidden="true" className="flex h-5 w-9 rounded-full bg-border-strong p-0.5 group-data-[state=checked]:bg-content">
        <Switch.Thumb className="block size-4 rounded-full bg-background data-[state=checked]:translate-x-4" />
      </span>
    </Switch.Root>
  )
  const contents = error && !highlightsReady ? (
    <div className="px-5 pb-4">
      <p role="alert">{error}</p>
      <button type="button" onClick={onRefreshHighlights} className="mt-2 min-h-11 underline">Try again</button>
    </div>
  ) : !highlightsReady ? <p role="status" className="px-5 pb-5 text-muted">Loading highlights…</p>
    : highlights.length === 0 ? (
      <div className={cn('flex flex-col items-center justify-center gap-2 px-8 text-center', mobile ? 'min-h-full py-8' : 'min-h-48 py-6')}>
        <p className="text-sm font-medium text-content">No highlights yet.</p>
        <p className="max-w-64 text-sm leading-relaxed text-muted">Select text in the note to highlight it.</p>
      </div>
    )
    : <ul className={cn('min-h-0 px-2 pb-2', !mobile && 'overflow-y-auto overscroll-contain')}>
      {highlights.map((highlight) => (
        <li key={highlight.id}>
          <button type="button" className="block min-h-11 w-full rounded-lg px-3 py-3 text-left text-sm leading-relaxed hover:bg-background-alt focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-content"
            onClick={() => {
              pendingSelection.current = highlight
              skipRestoreFocus.current = true
              setOpen(false)
            }}>
            <span className="relative block">
              <span aria-hidden="true" className="absolute right-full">“</span>
              {highlight.exact}<span aria-hidden="true" className="inline-block w-0">”</span>
            </span>
          </button>
        </li>
      ))}
    </ul>

  // Bottom-sticky within the essay: float while reading, then dock in this
  // natural end-of-note slot and scroll away before the recommendations.
  return (
    <div data-note-actions className="pointer-events-none sticky bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 mt-12 flex justify-center px-4">
      <div role="group" aria-label="Note activity" className="pointer-events-auto flex max-w-full items-center rounded-full bg-floating p-1.5 backdrop-blur-[40px]">
        {visitorReady
          ? <LazyModuleLikeButton targetId={likeTargetId} noun="note" variant="pill" />
          : <ModuleLikeButtonShell noun="note" variant="pill" />}
        {mobile ? (
          <BottomSheet open={open} onOpenChange={changeOpen} trigger={trigger} title="Highlights" headerAction={visibilitySwitch}
            onAfterClose={finishSelection} onCloseAutoFocus={(event) => { if (skipRestoreFocus.current) event.preventDefault() }}>
            {contents}
          </BottomSheet>
        ) : <Popover open={open} onOpenChange={changeOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent ref={popoverRef} side="top" sideOffset={14} collisionPadding={16} aria-label="Highlighted passages"
            onOpenAutoFocus={(event) => {
              // Open neutrally, rather than drawing a focus ring around the first
              // control. Tab still moves into the switch and quotes normally.
              event.preventDefault()
              popoverRef.current?.focus({ preventScroll: true })
            }}
            onCloseAutoFocus={(event) => {
              if (skipRestoreFocus.current) event.preventDefault()
              finishSelection()
            }}
            className="z-50 flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl bg-elevated text-sm text-content shadow-lg outline-none">
            <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-2">
              <p className="text-sm font-medium">Highlights</p>
              {visibilitySwitch}
            </div>
            {contents}
          </PopoverContent>
        </Popover>}
        <NoteViews key={noteId} noteId={noteId} enabled={visitorReady} />
      </div>
    </div>
  )
}

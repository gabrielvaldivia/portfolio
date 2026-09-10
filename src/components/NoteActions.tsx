'use client'

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Eye, Highlighter } from 'lucide-react'
import * as Switch from '@radix-ui/react-switch'
import { LazyModuleLikeButton, ModuleLikeButtonShell } from '@/components/LazyModuleLikeButton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { NoteActivityCount } from '@/components/NoteActivityCount'
import type { PublicHighlight } from '@/lib/noteHighlightAnchors'
import { defaultHighlightVisibility, hasOtherHighlighters, type HighlightVisibility } from '@/lib/noteHighlightVisibility'
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
  visibleHighlights: PublicHighlight[]
  highlightsReady: boolean
  highlightVisibility: HighlightVisibility
  onHighlightVisibilityChange: (visibility: HighlightVisibility) => void
  error: string
  onSelectHighlight: (highlight: PublicHighlight) => void
  onRefreshHighlights: () => void
  onOpenHighlights: () => void
}

function NoteViews({ noteId, enabled, reveal, onLoadSettled }: { noteId: string; enabled: boolean; reveal: boolean; onLoadSettled: () => void }) {
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
        const response = await fetch(`/api/notes/views?noteId=${encodeURIComponent(noteId)}`, { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10_000) })
        const data = await response.json()
        if (response.ok && Number.isSafeInteger(data.count) && data.count >= 0) {
          if (!disposed) setCount(data.count)
        }
      } catch { /* Unavailable counts stay a dash rather than a fabricated zero. */ }
      finally { if (!disposed) onLoadSettled() }
    }
    void recordView()
    document.addEventListener('visibilitychange', recordView)
    return () => { disposed = true; document.removeEventListener('visibilitychange', recordView) }
  }, [noteId, enabled, onLoadSettled])

  return (
    <Popover open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <PopoverTrigger asChild>
        <button type="button" data-note-views
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-text-body hover:bg-background-alt hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
          aria-label={count === null ? 'Views unavailable' : `${count.toLocaleString('en-US')} ${count === 1 ? 'view' : 'views'}`}
          aria-describedby={tooltipOpen ? tooltipId : undefined} aria-controls={tooltipOpen ? tooltipId : undefined} aria-haspopup={undefined}>
          <Eye className="size-[18px]" aria-hidden="true" />
          <NoteActivityCount value={count} reveal={reveal} compact />
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

function HighlightVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" className="size-6 shrink-0" aria-hidden="true" focusable="false"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {visible ? <>
        <path d="M19.25 12C19.25 13 17.5 18.25 12 18.25C6.5 18.25 4.75 13 4.75 12C4.75 11 6.5 5.75 12 5.75C17.5 5.75 19.25 11 19.25 12Z" />
        <circle cx="12" cy="12" r="2.25" />
      </> : <path d="M5.75 8.25C6.62017 7.13341 8.42054 5.75 12 5.75C15.5795 5.75 17.3798 7.13341 18.25 8.25M5.75 13.75C6.24116 14.3803 7.02868 15.0955 8.26521 15.599M8.26521 15.599C9.21939 15.9876 10.4409 16.25 12 16.25M8.26521 15.599L7.75 18.25M12 16.25C13.5591 16.25 14.7806 15.9876 15.7348 15.599M12 16.25L12 18.25M15.7348 15.599C16.9713 15.0955 17.7588 14.3803 18.25 13.75M15.7348 15.599L16.25 18.25" />}
    </svg>
  )
}

export function NoteActions({ noteId, likeTargetId, visitorReady, highlights, visibleHighlights, highlightsReady, highlightVisibility, onHighlightVisibilityChange, error, onSelectHighlight, onRefreshHighlights, onOpenHighlights }: NoteActionsProps) {
  const [open, setOpen] = useState(false)
  const [likesSettled, setLikesSettled] = useState(false)
  const [viewsSettled, setViewsSettled] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const finishLikes = useCallback(() => setLikesSettled(true), [])
  const finishViews = useCallback(() => setViewsSettled(true), [])
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverHeight, setPopoverHeight] = useState<number>()
  const mobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerMobileSnapshot)
  const pendingSelection = useRef<PublicHighlight | null>(null)
  const skipRestoreFocus = useRef(false)

  useEffect(() => {
    let disposed = false
    // An animating ancestor isolates the backdrop in Chromium. Let the page
    // entrance finish and the fonts load before revealing the frosted pill.
    const page = pillRef.current?.closest('.page-transition')
    const animations = page?.getAnimations().map((animation) => animation.finished.catch(() => {})) || []
    void Promise.all([...animations, document.fonts.ready]).then(() => {
      if (!disposed) setPageReady(true)
    })
    return () => { disposed = true }
  }, [])

  useEffect(() => {
    // Latch once: background refreshes or a transient failure must not replay
    // the entrance. Failed requests settle too, so the controls stay reachable.
    if (pageReady && visitorReady && likesSettled && viewsSettled && (highlightsReady || error)) setRevealed(true)
  }, [pageReady, visitorReady, likesSettled, viewsSettled, highlightsReady, error])

  function changeOpen(next: boolean) {
    setOpen(next)
    if (next) {
      setPopoverHeight(undefined)
      skipRestoreFocus.current = false
      onOpenHighlights()
      onRefreshHighlights()
    }
  }

  function changeHighlightVisibility(visibility: HighlightVisibility) {
    // Keep the open popover steady while its filtered contents change.
    if (popoverRef.current && popoverHeight === undefined) {
      setPopoverHeight(popoverRef.current.getBoundingClientRect().height)
    }
    onHighlightVisibilityChange(visibility)
  }

  function finishSelection() {
    const highlight = pendingSelection.current
    pendingSelection.current = null
    // Wait until the modal's scroll lock has been removed before jumping.
    if (highlight) requestAnimationFrame(() => onSelectHighlight(highlight))
  }

  const trigger = (
    <button type="button" aria-label={highlightsReady ? `${highlights.length} highlighted passages. Show highlights` : 'Show highlights'}
      className="inline-grid h-11 min-w-11 grid-cols-[18px_minmax(1ch,auto)] items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-text-body hover:bg-background-alt hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content">
      <Highlighter className={cn('col-start-1 row-start-1 size-[18px]', highlightsReady && highlights.length === 0 && 'col-span-2 justify-self-center')} aria-hidden="true" />
      <NoteActivityCount value={highlightsReady ? highlights.length : null} reveal={revealed} hideZero className="col-start-2 row-start-1 text-left" />
    </button>
  )
  const visibilityControls = (
    <div className="flex shrink-0 items-center gap-1">
      {([
        { key: 'you', label: 'You', accessibleLabel: 'Show your highlights', count: highlights.filter((mark) => mark.mine).length },
        { key: 'them', label: 'Them', accessibleLabel: "Show others' highlights", count: highlights.filter(hasOtherHighlighters).length },
      ] as const).map(({ key, label, accessibleLabel, count }) => (
        <Switch.Root key={key} checked={highlightVisibility[key]}
          onCheckedChange={(checked) => changeHighlightVisibility({ ...highlightVisibility, [key]: checked })}
          aria-label={accessibleLabel}
          className="group inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-sm font-medium text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content">
          <HighlightVisibilityIcon visible={highlightVisibility[key]} />
          <span className="group-data-[state=unchecked]:text-text-muted">{label}</span>
          <span className="tabular-nums text-text-muted group-data-[state=unchecked]:opacity-50">{highlightsReady ? count.toLocaleString('en-US') : '—'}</span>
        </Switch.Root>
      ))}
    </div>
  )
  const contents = error && !highlightsReady ? (
    <div className="px-5 pb-4">
      <p role="alert">{error}</p>
      <button type="button" onClick={onRefreshHighlights} className="mt-2 min-h-11 underline">Try again</button>
    </div>
  ) : !highlightsReady ? <p role="status" className="px-5 pb-5 text-text-body">Loading highlights…</p>
    : highlights.length === 0 ? (
      <div className={cn('flex flex-col items-center justify-center gap-2 px-8 text-center', mobile ? 'min-h-full py-8' : 'min-h-48 py-6')}>
        <p className="text-sm font-medium text-text-strong">No highlights yet.</p>
        <p className="max-w-64 text-sm leading-relaxed text-text-body">Select text in the note to highlight it.</p>
      </div>
    )
    : visibleHighlights.length === 0 ? (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 py-6 text-center">
        <p className="text-sm text-text-body">No highlights to show.</p>
        <button type="button" onClick={() => changeHighlightVisibility(defaultHighlightVisibility)} className="min-h-11 rounded-lg px-3 text-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content">Show all highlights</button>
      </div>
    ) : <ul className="px-2 pb-2">
      {visibleHighlights.map((highlight) => (
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
      <motion.div ref={pillRef} data-note-actions-pill data-ready={revealed} role="group" aria-label="Note activity"
        aria-hidden={!revealed} inert={!revealed}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: revealed ? 1 : 0, y: revealed || reducedMotion ? 0 : 4 }}
        transition={reducedMotion ? { duration: 0 } : { opacity: { duration: 0.25 }, y: { type: 'spring', stiffness: 400, damping: 14, restDelta: 0.01, restSpeed: 0.01 } }}
        style={{ visibility: revealed ? 'visible' : 'hidden' }}
        className="pointer-events-auto flex max-w-full items-center rounded-full bg-floating p-1.5 backdrop-blur-[40px]">
        {visitorReady
          ? <LazyModuleLikeButton targetId={likeTargetId} noun="note" variant="pill" eager countReveal={revealed} onLoadSettled={finishLikes} />
          : <ModuleLikeButtonShell noun="note" variant="pill" />}
        {mobile ? (
          <BottomSheet open={open} onOpenChange={changeOpen} trigger={trigger} title="Highlights" headerAction={visibilityControls}
            onAfterClose={finishSelection} onCloseAutoFocus={(event) => { if (skipRestoreFocus.current) event.preventDefault() }}>
            {contents}
          </BottomSheet>
        ) : <Popover open={open} onOpenChange={changeOpen}>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
          <PopoverContent ref={popoverRef} side="top" sideOffset={14} collisionPadding={16} aria-label="Highlighted passages"
            style={{ height: popoverHeight }}
            onOpenAutoFocus={(event) => {
              // Open neutrally, rather than drawing a focus ring around the first
              // control. Tab still moves into the visibility controls and quotes normally.
              event.preventDefault()
              popoverRef.current?.focus({ preventScroll: true })
            }}
            onCloseAutoFocus={(event) => {
              if (skipRestoreFocus.current) event.preventDefault()
              finishSelection()
            }}
            className="z-50 flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl bg-elevated text-sm text-text-strong shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.18),0_8px_24px_-12px_rgba(0,0,0,0.12)] outline-none">
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-2">
              <p className="shrink-0 text-base font-semibold">Highlights</p>
              {visibilityControls}
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain">{contents}</div>
          </PopoverContent>
        </Popover>}
        <NoteViews key={noteId} noteId={noteId} enabled={visitorReady} reveal={revealed} onLoadSettled={finishViews} />
      </motion.div>
    </div>
  )
}

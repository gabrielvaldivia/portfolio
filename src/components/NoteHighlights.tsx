'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Anchor as PopoverAnchor } from '@radix-ui/react-popover'
import { Highlighter, X } from 'lucide-react'
import { Popover, PopoverContent } from '@/components/ui/Popover'
import { NoteActions } from '@/components/NoteActions'
import { anchorFromRange, indexHighlightText, rangeFromAnchor } from '@/lib/noteHighlightDOM'
import { MAX_HIGHLIGHT_LENGTH, type HighlightAnchor, type HighlightResponse, type PublicHighlight } from '@/lib/noteHighlightAnchors'
import { cn } from '@/lib/cn'

type ActivePassage = { anchor: HighlightAnchor; range: Range; fromSelection: boolean }
const panelClass = 'z-50 flex w-72 max-w-[calc(100vw-32px)] max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-background p-4 text-sm text-content shadow-lg outline-none'
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-content px-4 py-2 text-background disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content'

export function NoteHighlights({ noteId, likeTargetId, version, children }: { noteId: string; likeTargetId: string; version: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const [highlights, setHighlights] = useState<PublicHighlight[]>([])
  const [active, setActive] = useState<ActivePassage | null>(null)
  const [ready, setReady] = useState(false)
  const [visitorReady, setVisitorReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [touchSelection, setTouchSelection] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const activeRef = useRef(active)
  activeRef.current = active
  const anchorRef = useRef<{ contextElement?: Element; getBoundingClientRect: () => DOMRect }>({ getBoundingClientRect: () => new DOMRect() })
  anchorRef.current.contextElement = rootRef.current || undefined
  anchorRef.current.getBoundingClientRect = () => {
    const range = activeRef.current?.range
    const viewport = window.visualViewport
    const top = viewport?.offsetTop || 0
    const bottom = top + (viewport?.height || window.innerHeight)
    const rects = Array.from(range?.getClientRects() || []).filter((rect) => rect.width && rect.height && rect.bottom > top && rect.top < bottom)
    if (!rects.length) return range?.getBoundingClientRect() || new DOMRect()
    if (!touchSelection) return rects[0]
    // On touch screens, anchor to the visible selection as a whole. If there
    // isn't room above it, Radix can place the action below the last line.
    const left = Math.min(...rects.map((rect) => rect.left))
    const right = Math.max(...rects.map((rect) => rect.right))
    const first = Math.max(top, Math.min(...rects.map((rect) => rect.top)))
    const last = Math.min(bottom, Math.max(...rects.map((rect) => rect.bottom)))
    return new DOMRect(left, first, right - left, last - first)
  }
  const current = active ? highlights.find((h) => h.start === active.anchor.start && h.end === active.anchor.end) : null

  const refresh = useCallback(async () => {
    if (savingRef.current) return
    const requestId = ++requestRef.current
    try {
      const response = await fetch(`/api/notes/highlights?noteId=${encodeURIComponent(noteId)}`, { cache: 'no-store' })
      const data: (HighlightResponse & { error?: string }) | null = await response.json().catch(() => null)
      if (!mountedRef.current || requestId !== requestRef.current) return
      if (!response.ok || !data) throw new Error(data?.error || 'Highlights are temporarily unavailable. Please try again.')
      if (data.version !== version) throw new Error('This note changed. Refresh it to see and save highlights.')
      setHighlights(data.highlights)
      setReady(true)
      setError('')
    } catch (error) {
      if (mountedRef.current && requestId === requestRef.current) {
        setReady(false)
        setError(error instanceof Error ? error.message : 'Unable to load highlights.')
      }
    } finally {
      // Establish the shared visitor cookie before starting likes and views.
      if (mountedRef.current && requestId === requestRef.current) setVisitorReady(true)
    }
  }, [noteId, version])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh() }
    // Refresh on returning to the page and while reading, without caching visitor ownership.
    const interval = window.setInterval(onFocus, 60_000)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      mountedRef.current = false
      requestRef.current++
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !ready || !highlights.length) return
    let disposed = false
    const handles: { remove(): void }[] = []
    void import('@highlighters/core').then(({ highlight }) => {
      if (disposed) return
      const index = indexHighlightText(root)
      // Paint overlapping passages once so popular text doesn't become an opaque stripe.
      const spans: { start: number; end: number }[] = []
      for (const mark of highlights) {
        const previous = spans.at(-1)
        if (previous && mark.start <= previous.end) previous.end = Math.max(previous.end, mark.end)
        else spans.push({ start: mark.start, end: mark.end })
      }
      for (const span of spans) {
        const range = rangeFromAnchor(root, { ...span, exact: index.text.slice(span.start, span.end), prefix: '', suffix: '' }, index)
        if (range) handles.push(highlight(range, {
          color: '#d8b64c', opacity: 0.24, vivid: true, snap: 'none',
          animation: { draw: false }, seed: span.start,
        }, root))
      }
    }).catch(() => { if (!disposed) setError('Highlights could not be displayed. Please refresh to try again.') })
    return () => { disposed = true; handles.forEach((handle) => handle.remove()) }
  }, [highlights, ready])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    setTouchSelection(navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches)
    const updateSelection = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (savingRef.current || panelRef.current?.contains(document.activeElement)) return
        const selection = window.getSelection()
        const root = rootRef.current
        if (!root || !selection?.rangeCount || selection.isCollapsed) {
          setActive((current) => current?.fromSelection ? null : current)
          return
        }
        const range = selection.getRangeAt(0).cloneRange()
        const anchor = anchorFromRange(root, range)
        if (!anchor || anchor.exact.length < 3 || anchor.exact.length > MAX_HIGHLIGHT_LENGTH) { setActive(null); return }
        setActive({ anchor, range, fromSelection: true })
      }, 180)
    }
    // Mobile browsers can finalize a long-press or selection-handle drag only
    // on release. Don't rely on selectionchange alone, or cancel native selection.
    const onTouchEnd = () => { setTouchSelection(true); updateSelection() }
    const onPointerUp = (event: PointerEvent) => {
      setTouchSelection(event.pointerType === 'touch' || event.pointerType === 'pen')
      updateSelection()
    }
    document.addEventListener('selectionchange', updateSelection)
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('pointerup', onPointerUp, { passive: true })
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', updateSelection)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  async function save(remove = false) {
    if (!active || !ready || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    requestRef.current++ // Ignore a refresh that was started before this mutation.
    setError('')
    try {
      const response = await fetch('/api/notes/highlights', {
        method: remove ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, version, anchor: active.anchor }),
      })
      const data: (HighlightResponse & { error?: string }) | null = await response.json().catch(() => null)
      if (!mountedRef.current) return
      if (!response.ok || !data) throw new Error(data?.error || 'Unable to save your highlight. Please try again.')
      setHighlights(data.highlights)
      setAnnouncement(remove ? 'Your highlight was removed.' : 'Highlight saved. It is now visible to everyone.')
      setActive(null)
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      if (mountedRef.current) setError(error instanceof Error ? error.message : 'Unable to save your highlight.')
    } finally {
      savingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  return (
    <div className="note-highlights">
      <div ref={rootRef} data-note-highlight-body tabIndex={-1} className="relative outline-none" onClick={(event) => {
        if (!ready || window.getSelection()?.toString() || (event.target as Element).closest('a, button')) return
        const root = rootRef.current
        if (!root) return
        // Overlays are non-interactive; hit-test real text without changing links or selection.
        const index = indexHighlightText(root)
        const match = [...highlights].sort((a, b) => (a.end - a.start) - (b.end - b.start)).find((mark) => {
          const range = rangeFromAnchor(root, mark, index)
          return range && [...range.getClientRects()].some((rect) =>
            event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)
        })
        if (match) {
          const range = rangeFromAnchor(root, match, index)
          if (range) setActive({ anchor: match, range, fromSelection: false })
        }
      }}>{children}</div>

      <NoteActions noteId={noteId} likeTargetId={likeTargetId} visitorReady={visitorReady}
        highlights={highlights} highlightsReady={ready} error={error}
        onRefreshHighlights={() => void refresh()}
        onOpenHighlights={() => { setActive(null); window.getSelection()?.removeAllRanges() }}
        onSelectHighlight={(mark) => {
          const root = rootRef.current
          if (!root) return
          const range = rangeFromAnchor(root, mark)
          if (!range) { setAnnouncement('This passage changed. Refresh the note to find it.'); return }
          setActive(null)
          window.getSelection()?.removeAllRanges()
          root.focus({ preventScroll: true })
          const rect = Array.from(range.getClientRects()).find((rect) => rect.width && rect.height) || range.getBoundingClientRect()
          const viewport = window.visualViewport
          window.scrollBy({ top: rect.top - (viewport?.offsetTop || 0) - (viewport?.height || window.innerHeight) / 3, behavior: 'instant' })
          setAnnouncement(`Jumped to highlighted passage: ${mark.exact}`)
        }} />

      <Popover open={Boolean(active)} onOpenChange={(open) => { if (!open && !savingRef.current) setActive(null) }}>
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          ref={panelRef}
          className={cn(active?.fromSelection ? 'z-50 outline-none' : panelClass, 'note-highlight-action')}
          side="top" sideOffset={8}
          updatePositionStrategy="always"
          collisionPadding={16} aria-label="Highlight passage"
          onOpenAutoFocus={(event) => { if (active?.fromSelection) event.preventDefault() }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (document.activeElement === document.body || panelRef.current?.contains(document.activeElement)) rootRef.current?.focus({ preventScroll: true })
          }}
          onInteractOutside={(event) => { if (savingRef.current || window.getSelection()?.toString()) event.preventDefault() }}
        >
          {active?.fromSelection ? (
            <>
              <button type="button" className={cn(actionClass, 'shadow-lg')} disabled={!ready || saving}
                onPointerDown={(event) => event.preventDefault()}
                onPointerUp={(event) => {
                  // Commit on touch release before Safari can collapse the
                  // selection and remove the button ahead of its delayed click.
                  if (event.pointerType === 'touch' || event.pointerType === 'pen') {
                    event.preventDefault()
                    void save()
                  }
                }}
                onClick={() => void save()}>
                {saving ? 'Saving…' : 'Highlight'}
              </button>
              {error ? <p role="alert" className="mt-2 max-w-64 rounded-lg bg-background p-3 text-sm text-content shadow-lg">{error}</p> : null}
            </>
          ) : <>
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{current ? `Highlighted by ${current.count} ${current.count === 1 ? 'reader' : 'readers'}` : 'Highlight passage'}</span>
            <button type="button" aria-label="Close highlight actions" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-background-alt" onClick={() => { setActive(null); window.getSelection()?.removeAllRanges() }}><X className="size-4" aria-hidden="true" /></button>
          </div>
          <p className="text-muted">{current?.mine ? 'You highlighted this passage.' : 'Visible to everyone. No account needed.'}</p>
          {error ? <p role="alert">{error}</p> : null}
          {active && active.anchor.exact.length > MAX_HIGHLIGHT_LENGTH ? <p role="alert">Select a shorter passage (up to 1,000 characters).</p> :
            <button type="button" className={actionClass} disabled={!ready || saving}
              onPointerDown={(event) => event.preventDefault()} onClick={() => void save(Boolean(current?.mine))}>
              <Highlighter className="size-4" aria-hidden="true" />
              {saving ? 'Saving…' : current?.mine ? 'Remove my highlight' : 'Highlight'}
            </button>}
          </>}
        </PopoverContent>
      </Popover>
      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Anchor as PopoverAnchor } from '@radix-ui/react-popover'
import { Highlighter, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { anchorFromRange, indexHighlightText, rangeFromAnchor } from '@/lib/noteHighlightDOM'
import { MAX_HIGHLIGHT_LENGTH, type HighlightAnchor, type HighlightResponse, type PublicHighlight } from '@/lib/noteHighlightAnchors'
import { cn } from '@/lib/cn'

type ActivePassage = { anchor: HighlightAnchor; range: Range; fromSelection: boolean }
const panelClass = 'z-50 flex w-72 max-w-[calc(100vw-32px)] max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-background p-4 text-sm text-content shadow-lg outline-none'
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-content px-4 py-2 text-background disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content'

export function NoteHighlights({ noteId, version, children }: { noteId: string; version: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const requestRef = useRef(0)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const [highlights, setHighlights] = useState<PublicHighlight[]>([])
  const [active, setActive] = useState<ActivePassage | null>(null)
  const [showHighlights, setShowHighlights] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const activeRef = useRef(active)
  activeRef.current = active
  const anchorRef = useRef({ getBoundingClientRect: () => new DOMRect() })
  anchorRef.current.getBoundingClientRect = () => {
    const range = activeRef.current?.range
    // Anchor to the final selected line, not the full multi-paragraph rectangle.
    const rects = range?.getClientRects()
    return rects?.length ? rects[rects.length - 1] : range?.getBoundingClientRect() || new DOMRect()
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
    }
  }, [noteId, version])

  useEffect(() => {
    mountedRef.current = true
    try { setShowHighlights(localStorage.getItem('gv-note-highlights-visible') !== 'false') } catch { /* Storage can be disabled. */ }
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
    if (!root || !showHighlights || !ready || !highlights.length) return
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
  }, [highlights, ready, showHighlights])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
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
        if (!anchor || anchor.exact.length < 3) { setActive(null); return }
        setMenuOpen(false)
        setActive({ anchor, range, fromSelection: true })
      }, 180)
    }
    document.addEventListener('selectionchange', updateSelection)
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', updateSelection) }
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
      if (!remove) {
        setShowHighlights(true)
        try { localStorage.setItem('gv-note-highlights-visible', 'true') } catch { /* Optional preference. */ }
      }
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

  function openPassage(mark: PublicHighlight) {
    const root = rootRef.current
    if (!root) return
    const range = rangeFromAnchor(root, mark)
    if (!range) return
    setMenuOpen(false)
    window.getSelection()?.removeAllRanges()
    const parent = range.startContainer.parentElement
    parent?.scrollIntoView({ block: 'center', behavior: 'instant' })
    setActive({ anchor: mark, range, fromSelection: false })
  }

  return (
    <div className="note-highlights">
      <div className="flex justify-end pb-4 text-sm">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button ref={menuRef} type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-muted hover:text-content focus-visible:outline-2 focus-visible:outline-content">
              <Highlighter className="size-4" aria-hidden="true" />
              Highlights{highlights.length ? ` · ${highlights.length}` : ''}
            </button>
          </PopoverTrigger>
          <PopoverContent className={panelClass} align="end" collisionPadding={16} aria-label="Reader highlights">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
              Show highlights
              <input type="checkbox" checked={showHighlights} onChange={(event) => {
                setShowHighlights(event.target.checked)
                try { localStorage.setItem('gv-note-highlights-visible', String(event.target.checked)) } catch { /* Optional preference. */ }
              }} className="size-5 accent-current" />
            </label>
            <p className="text-muted">Select text to highlight it publicly. Your highlights are remembered in this browser.</p>
            {error ? <div role="alert" className="flex flex-col gap-2"><p>{error}</p><button type="button" className={actionClass} onClick={() => void refresh()}>Try again</button></div> : null}
            {!ready && !error ? <p role="status">Loading highlights…</p> : null}
            {ready && !highlights.length ? <p className="text-muted">No highlights yet.</p> : null}
            {highlights.length ? <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto overscroll-contain">
              {highlights.map((mark) => <li key={mark.id}>
                <button type="button" onClick={() => openPassage(mark)} className="flex w-full flex-col gap-2 rounded-lg p-3 text-left hover:bg-background-alt focus-visible:outline-2 focus-visible:outline-content">
                  <span className="line-clamp-2">“{mark.exact}”</span>
                  <span className="text-xs text-muted">{mark.count} {mark.count === 1 ? 'reader' : 'readers'}{mark.mine ? ' · Including you' : ''}</span>
                </button>
              </li>)}
            </ul> : null}
          </PopoverContent>
        </Popover>
      </div>

      <div ref={rootRef} data-note-highlight-body className="relative" onClick={(event) => {
        if (!showHighlights || !ready || window.getSelection()?.toString() || (event.target as Element).closest('a, button')) return
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

      <Popover open={Boolean(active)} onOpenChange={(open) => { if (!open && !savingRef.current) setActive(null) }}>
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          ref={panelRef} className={cn(panelClass, 'note-highlight-action')} side="bottom" sideOffset={12}
          collisionPadding={16} aria-label="Highlight passage"
          onOpenAutoFocus={(event) => { if (active?.fromSelection) event.preventDefault() }}
          onCloseAutoFocus={(event) => { event.preventDefault(); if (panelRef.current?.contains(document.activeElement)) menuRef.current?.focus({ preventScroll: true }) }}
          onInteractOutside={(event) => { if (savingRef.current || window.getSelection()?.toString()) event.preventDefault() }}
        >
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
        </PopoverContent>
      </Popover>
      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    </div>
  )
}

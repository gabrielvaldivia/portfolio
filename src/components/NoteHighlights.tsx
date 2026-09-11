'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Anchor as PopoverAnchor } from '@radix-ui/react-popover'
import { toast } from 'sonner'
import { Popover, PopoverContent } from '@/components/ui/Popover'
import { Toaster } from '@/components/ui/Toaster'
import { NoteActions } from '@/components/NoteActions'
import { HighlightAttributionToast } from '@/components/HighlightAttributionToast'
import { anchorFromRange, indexHighlightText, rangeFromAnchor } from '@/lib/noteHighlightDOM'
import { navigateToNoteHighlight } from '@/lib/noteHighlightNavigation'
import { attachNoteHighlightHover } from '@/lib/noteHighlightHover'
import { MAX_HIGHLIGHT_LENGTH, type HighlightAnchor, type HighlightResponse, type PublicHighlight } from '@/lib/noteHighlightAnchors'
import { defaultHighlightVisibility, highlightVisibilityStorageKey, isHighlightVisible, legacyHighlightVisibilityStorageKey, parseHighlightVisibility, type HighlightVisibility } from '@/lib/noteHighlightVisibility'
import { cn } from '@/lib/cn'

type ActivePassage = { anchor: HighlightAnchor; range: Range; fromSelection: boolean; fromHover?: boolean }
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-content px-4 py-2 text-xs leading-none text-background disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content'

export function NoteHighlights({ noteId, likeTargetId, version, children }: { noteId: string; likeTargetId: string; version: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const attributionRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const navigationCleanupRef = useRef<(() => void) | null>(null)
  const hoverRef = useRef<ReturnType<typeof attachNoteHighlightHover> | null>(null)
  const [highlights, setHighlights] = useState<PublicHighlight[]>([])
  const [active, setActive] = useState<ActivePassage | null>(null)
  const [ready, setReady] = useState(false)
  const [visitorReady, setVisitorReady] = useState(false)
  const [highlightVisibility, setHighlightVisibility] = useState(defaultHighlightVisibility)
  const visibleHighlights = useMemo(() => highlights.filter((mark) => isHighlightVisible(mark, highlightVisibility)), [highlights, highlightVisibility])
  const [saving, setSaving] = useState(false)
  const [paused, setPaused] = useState(false)
  const [touchSelection, setTouchSelection] = useState(false)
  const [error, setError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const errorToastId = `note-highlight-error-${noteId}`
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
  const attribution = ready && !active?.fromSelection && current && isHighlightVisible(current, highlightVisibility) ? current : null
  const dismissAttribution = useCallback(() => {
    hoverRef.current?.dismiss()
    setActive((passage) => passage?.fromSelection ? passage : null)
  }, [])

  useEffect(() => () => navigationCleanupRef.current?.(), [noteId, version])

  useEffect(() => {
    if (error) toast(error, { id: errorToastId })
  }, [error, errorToastId])

  useEffect(() => () => { toast.dismiss(errorToastId) }, [errorToastId])

  useEffect(() => {
    const readVisibility = () => {
      try { return parseHighlightVisibility(localStorage.getItem(highlightVisibilityStorageKey), localStorage.getItem(legacyHighlightVisibilityStorageKey)) }
      catch { return defaultHighlightVisibility }
    }
    setHighlightVisibility(readVisibility())
    const onStorage = (event: StorageEvent) => {
      if (event.key === highlightVisibilityStorageKey || event.key === legacyHighlightVisibilityStorageKey || event.key === null) {
        navigationCleanupRef.current?.()
        hoverRef.current?.dismiss()
        setHighlightVisibility(readVisibility())
        setActive((current) => current?.fromSelection ? current : null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function changeHighlightVisibility(visibility: HighlightVisibility) {
    navigationCleanupRef.current?.()
    hoverRef.current?.dismiss()
    setHighlightVisibility(visibility)
    setActive((current) => current?.fromSelection ? current : null)
    try { localStorage.setItem(highlightVisibilityStorageKey, JSON.stringify(visibility)) } catch { /* Still works for this visit. */ }
  }

  const refresh = useCallback(async () => {
    if (savingRef.current) return
    const requestId = ++requestRef.current
    try {
      const response = await fetch(`/api/notes/highlights?noteId=${encodeURIComponent(noteId)}`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
      const data: (HighlightResponse & { error?: string }) | null = await response.json().catch(() => null)
      if (!mountedRef.current || requestId !== requestRef.current) return
      if (!response.ok || !data) throw new Error(data?.error || 'Highlights are temporarily unavailable. Please try again.')
      if (data.version !== version) throw new Error('This note changed. Refresh it to see and save highlights.')
      setHighlights(data.highlights)
      setPaused(data.paused === true)
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
    if (!root || !ready || !visibleHighlights.length) return
    let disposed = false
    const handles: { remove(): void }[] = []
    void import('@/lib/noteHighlightMarks').then(({ createNoteHighlightMark, getNoteHighlightSpans }) => {
      if (disposed) return
      const index = indexHighlightText(root)
      for (const span of getNoteHighlightSpans(visibleHighlights, highlightVisibility)) {
        const range = rangeFromAnchor(root, { ...span, exact: index.text.slice(span.start, span.end), prefix: '', suffix: '' }, index)
        if (range) handles.push(createNoteHighlightMark(root, range, span.start, span.mine))
      }
    }).catch(() => { if (!disposed) setError('Highlights could not be displayed. Please refresh to try again.') })
    return () => { disposed = true; handles.forEach((handle) => handle.remove()) }
  }, [visibleHighlights, ready, highlightVisibility])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !ready || !visibleHighlights.length) return
    const hover = attachNoteHighlightHover(root, visibleHighlights, {
      getPanel: () => attributionRef.current,
      canHover: () => !savingRef.current && (!activeRef.current || activeRef.current.fromHover === true),
      onChange: (passage) => setActive((current) => {
        if (current && !current.fromHover) return current
        return passage ? { ...passage, fromSelection: false, fromHover: true } : null
      }),
    })
    hoverRef.current = hover
    return () => { hover.destroy(); hoverRef.current = null }
  }, [visibleHighlights, ready])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    setTouchSelection(navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches)
    const updateSelection = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (savingRef.current || panelRef.current?.contains(document.activeElement) || attributionRef.current?.contains(document.activeElement)) return
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

  const save = useCallback(async (remove = false) => {
    if (!active || !ready || savingRef.current || (!remove && paused) || (remove && !current?.mine)) return
    savingRef.current = true
    setSaving(true)
    requestRef.current++ // Ignore a refresh that was started before this mutation.
    setError('')
    toast.dismiss(errorToastId)
    try {
      const response = await fetch('/api/notes/highlights', {
        method: remove ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, version, anchor: active.anchor }),
      })
      const data: (HighlightResponse & { error?: string }) | null = await response.json().catch(() => null)
      if (!mountedRef.current) return
      if (!response.ok || !data) throw new Error(data?.error || 'Unable to save your highlight. Please try again.')
      setHighlights(data.highlights)
      setPaused(data.paused === true)
      setAnnouncement(remove ? 'Your highlight was removed.' : 'Highlight saved. It is now visible to everyone.')
      setActive(null)
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      if (mountedRef.current) setError(error instanceof Error ? error.message : 'Unable to save your highlight.')
    } finally {
      savingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }, [active, current, ready, paused, noteId, version, errorToastId])

  const removeHighlight = useCallback(() => { void save(true) }, [save])

  return (
    <div className="note-highlights" onPointerDownCapture={(event) => {
      // Sonner pauses dragging while text is selected. Starting a toast gesture
      // clears the passage selection before its pointer handlers run.
      if ((event.target as Element).closest('[data-sonner-toast]')) window.getSelection()?.removeAllRanges()
    }}>
      <div ref={rootRef} data-note-highlight-body tabIndex={-1} className="relative max-w-[760px] outline-none" onClick={(event) => {
        // Mouse attribution follows hover; clicking must not pin it open.
        if (!touchSelection) return
        if (!ready || !visibleHighlights.length || window.getSelection()?.toString() || (event.target as Element).closest('a, button')) return
        const root = rootRef.current
        if (!root) return
        // Overlays are non-interactive; hit-test real text without changing links or selection.
        const index = indexHighlightText(root)
        const match = [...visibleHighlights].sort((a, b) => (a.end - a.start) - (b.end - b.start)).find((mark) => {
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
        highlights={highlights} visibleHighlights={visibleHighlights} highlightsReady={ready} error={error}
        highlightVisibility={highlightVisibility} onHighlightVisibilityChange={changeHighlightVisibility}
        onRefreshHighlights={() => void refresh()}
        onOpenHighlights={() => { setActive(null); window.getSelection()?.removeAllRanges() }}
        onSelectHighlight={(mark) => {
          navigationCleanupRef.current?.()
          const root = rootRef.current
          if (!root) return
          const range = rangeFromAnchor(root, mark)
          if (!range) { setAnnouncement('This passage changed. Refresh the note to find it.'); return }
          setActive(null)
          window.getSelection()?.removeAllRanges()
          root.focus({ preventScroll: true })
          navigationCleanupRef.current = navigateToNoteHighlight(root, range, mark.start, mark.mine && highlightVisibility.you)
          setAnnouncement(`Jumped to highlighted passage: ${mark.exact}`)
        }} />

      <Popover open={active?.fromSelection === true} onOpenChange={(open) => {
        if (!open && !savingRef.current) setActive((passage) => passage?.fromSelection ? null : passage)
      }}>
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          ref={panelRef}
          className="note-highlight-action z-50 outline-none"
          side="top" sideOffset={8}
          updatePositionStrategy="always"
          collisionPadding={16} role="dialog" aria-label="Highlight passage"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (document.activeElement === document.body || panelRef.current?.contains(document.activeElement)) rootRef.current?.focus({ preventScroll: true })
          }}
          onInteractOutside={(event) => { if (savingRef.current || window.getSelection()?.toString()) event.preventDefault() }}
        >
          {active?.fromSelection ? (
            <>
              <button type="button" className={cn(actionClass, 'shadow-lg')} disabled={!ready || saving || paused}
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
                {paused ? 'Highlights paused' : saving ? 'Saving…' : 'Highlight'}
              </button>
            </>
          ) : null}
        </PopoverContent>
      </Popover>
      <Toaster />
      <HighlightAttributionToast id={`note-highlight-attribution-${noteId}`} highlight={attribution}
        hovered={active?.fromHover === true} panelRef={attributionRef} onRemove={removeHighlight} removing={saving} onDismiss={dismissAttribution} />
      <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    </div>
  )
}

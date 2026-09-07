'use client'

import { Button, useDocumentInfo } from '@payloadcms/ui'
import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { HighlightModerationAction, HighlightModerationState } from '@/lib/noteHighlightModeration'

const endpoint = '/api/notes/highlights/moderation'
type Confirmation = { action: HighlightModerationAction; title: string; description: string; label: string }

export function NoteHighlightModeration() {
  const { id } = useDocumentInfo()
  const noteId = id == null ? '' : String(id)
  const [data, setData] = useState<HighlightModerationState | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Confirmation | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (!noteId) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${endpoint}?noteId=${encodeURIComponent(noteId)}`, {
        cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load highlights.')
      if (!controller.signal.aborted) setData(result)
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load highlights.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    setData(null)
    void refresh()
    return () => requestRef.current?.abort()
  }, [refresh])

  async function apply(action: HighlightModerationAction) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, ...action }), signal: AbortSignal.timeout(10_000) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to update highlights.')
      setData(result)
      setPending(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update highlights. Refresh to check whether the change completed.')
    } finally {
      setBusy(false)
    }
  }

  function confirm(confirmation: Confirmation) {
    triggerRef.current = document.activeElement as HTMLElement | null
    setError('')
    setPending(confirmation)
  }

  if (!noteId) return <p>Save this note before managing highlights.</p>

  return (
    <section className="note-highlight-moderation" aria-labelledby="highlight-moderation-title" aria-busy={loading || busy}>
      <div className="note-highlight-moderation__heading">
        <h2 id="highlight-moderation-title" tabIndex={-1}>Highlights</h2>
        <Button type="button" buttonStyle="secondary" size="small" disabled={loading || busy} onClick={() => void refresh()}>Refresh</Button>
      </div>
      <p className="note-highlight-moderation__help">Each browser can save 5 passages covering up to 15% of a note. Changes here take effect immediately, without publishing.</p>
      {error && !pending ? <p role="alert">{error}</p> : null}
      {loading ? <p role="status">Loading highlights…</p> : null}
      {data ? <>
        <label className="note-highlight-moderation__pause">
          <input type="checkbox" checked={data.paused} disabled={busy || loading} onChange={event => void apply({ action: 'pause', paused: event.target.checked })} />
          Pause new highlights on this note
        </label>
        <p className="note-highlight-moderation__help">Existing highlights stay visible, and readers can still remove their own.</p>
        {!data.passages.length ? <p>No highlights to moderate.</p> : null}
        {data.passages.map(passage => <article key={passage.key} className="note-highlight-moderation__passage">
          <blockquote>{passage.quote}</blockquote>
          <Button type="button" buttonStyle="secondary" size="small" disabled={busy || loading} onClick={() => confirm({
            action: { action: 'remove-passage', anchorKey: passage.key }, title: 'Remove this passage?', label: 'Remove passage',
            description: 'This removes every reader’s highlight of this passage and its Activity entry. This cannot be undone.',
          })}>Remove passage</Button>
          <details>
            <summary>{passage.readers.length} {passage.readers.length === 1 ? 'reader' : 'readers'}</summary>
            {passage.readers.map((reader, index) => <div key={reader.id} className="note-highlight-moderation__reader">
              <p>Reader {index + 1}{reader.location ? ` from ${reader.location}` : ' · Location unavailable'}<br />
                <time dateTime={reader.createdAt}>{new Date(reader.createdAt).toLocaleString()}</time>
              </p>
              <div className="note-highlight-moderation__controls">
                <Button type="button" buttonStyle="secondary" size="small" disabled={busy || loading} onClick={() => confirm({
                  action: { action: 'remove-reader', readerId: reader.id }, title: 'Remove this reader’s highlights?', label: 'Remove highlights',
                  description: 'This removes every highlight this browser saved on this note, including its Activity contributions. Other readers are unaffected. This cannot be undone.',
                })}>Remove reader’s highlights</Button>
                <Button type="button" buttonStyle="secondary" size="small" disabled={busy || loading} onClick={() => confirm({
                  action: { action: 'block-reader', readerId: reader.id }, title: 'Remove and block this reader?', label: 'Remove and block',
                  description: 'This removes every highlight this browser saved on this note and blocks new highlights here. You can unblock it later, but removed highlights cannot be restored. Clearing cookies can bypass a browser block.',
                })}>Remove and block</Button>
              </div>
            </div>)}
          </details>
        </article>)}
        {data.blockedReaders.length ? <section aria-labelledby="blocked-highlight-readers">
          <h3 id="blocked-highlight-readers">Blocked on this note</h3>
          {data.blockedReaders.map((reader, index) => <div key={reader.id} className="note-highlight-moderation__reader">
            <p>Browser {index + 1}{reader.location ? ` from ${reader.location}` : ''} · Blocked {new Date(reader.createdAt).toLocaleString()}</p>
            <Button type="button" buttonStyle="secondary" size="small" disabled={busy || loading} onClick={() => void apply({ action: 'unblock-reader', readerId: reader.id })}>Unblock</Button>
          </div>)}
        </section> : null}
      </> : null}
      <Dialog.Root open={Boolean(pending)} onOpenChange={open => { if (!open && !busy) setPending(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="note-highlight-moderation__overlay" />
          <Dialog.Content role="alertdialog" className="note-highlight-moderation__confirmation"
            onOpenAutoFocus={event => { event.preventDefault(); cancelRef.current?.focus() }}
            onCloseAutoFocus={event => { event.preventDefault(); (triggerRef.current?.isConnected ? triggerRef.current : document.getElementById('highlight-moderation-title'))?.focus() }}
            onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (busy) event.preventDefault() }}>
            <Dialog.Title>{pending?.title}</Dialog.Title>
            <Dialog.Description>{pending?.description}</Dialog.Description>
            {error ? <p role="alert">{error}</p> : null}
            <div className="note-highlight-moderation__controls">
              <Button ref={cancelRef} type="button" buttonStyle="secondary" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
              <Button type="button" disabled={busy} onClick={() => { if (pending) void apply(pending.action) }}>{busy ? 'Updating…' : pending?.label}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

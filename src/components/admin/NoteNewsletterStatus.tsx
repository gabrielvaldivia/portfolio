'use client'

import { Button, useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import type { getNoteNewsletterStatus } from '@/lib/noteNewsletterQueue'

type Status = Awaited<ReturnType<typeof getNoteNewsletterStatus>> & {
  published: boolean; previouslyPublished: boolean; legacySentAt?: string | null
}

export function NoteNewsletterStatus() {
  const { id, data: noteDocument } = useDocumentInfo()
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    setError('')
    setStatus(null)
    fetch(`/api/notes/newsletter-status?noteId=${encodeURIComponent(String(id))}`, {
      cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
    }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load email delivery.')
      if (!controller.signal.aborted) setStatus(data)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load email delivery.')
    })
    return () => { controller.abort() }
  }, [id, noteDocument?.updatedAt, refresh])

  useEffect(() => {
    if (!id) return
    const onFocus = () => {
      if (document.visibilityState === 'visible') setRefresh(value => value + 1)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [id])

  return <section className="note-highlight-moderation" aria-labelledby="newsletter-status-title">
    <div className="note-highlight-moderation__heading">
      <h2 id="newsletter-status-title">Email delivery</h2>
      {id ? <Button type="button" buttonStyle="secondary" size="small" onClick={() => setRefresh(value => value + 1)}>Refresh</Button> : null}
    </div>
    <p>Publishing a new note queues an email for each confirmed subscriber. Up to 100 emails are sent per day across all notes. Delivery runs automatically every 5 minutes and the daily allowance resets at midnight UTC.</p>
    {error ? <p role="alert">{error}</p> : null}
    {id && !status && !error ? <p role="status">Loading delivery status…</p> : null}
    {!id ? <p>Save and publish this note to start its email queue.</p> : null}
    {status ? <div aria-live="polite" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {!status.queued ? <p>{status.legacySentAt ? 'This note’s newsletter was already sent.' : status.previouslyPublished ? 'This note was published before the queue was enabled. It will not be emailed again.' : 'Emails will be queued when this note is first published.'}</p> : <>
        <p>{status.sent} of {status.total} sent · {status.pending} waiting{status.skipped ? ` · ${status.skipped} unsubscribed or removed` : ''}</p>
        {status.completedAt ? <p>Delivery complete.</p> : null}
        {!status.published && status.pending ? <p>Delivery is paused while this note is unpublished.</p> : null}
        {status.pending && status.usedToday >= status.dailyLimit ? <p>Today’s allowance has been used. Remaining emails will continue after midnight UTC.</p> : null}
        {status.pending && status.pausedUntil ? <p>Delivery is waiting to retry after {new Date(status.pausedUntil).toLocaleString()}{status.lastError === 'daily_quota_exceeded' || status.lastError === 'monthly_quota_exceeded' ? ' because the sender’s email allowance is exhausted' : ' because the email provider could not accept a delivery'}.</p> : null}
        {status.review ? <p role="alert">{status.review} delivery receipt{status.review === 1 ? ' needs' : 's need'} review in Resend. Automatic retries stopped to avoid sending a duplicate.</p> : null}
        <p className="note-highlight-moderation__help">Other account emails may use part of the sender’s allowance. Readers who unsubscribe before their turn are skipped. Editing or republishing this note does not start another mailing.</p>
      </>}
    </div> : null}
  </section>
}

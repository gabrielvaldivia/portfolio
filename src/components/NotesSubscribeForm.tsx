'use client'

import { useState } from 'react'

export type SubscriptionMessage = 'confirmed' | 'invalid' | 'unsubscribed'

const initialMessages: Record<SubscriptionMessage, string> = {
  confirmed: 'You’re subscribed. The next note will arrive by email.',
  invalid: 'That link is invalid or expired. Enter your email to try again.',
  unsubscribed: 'You’ve been unsubscribed.',
}

export function NotesSubscribeForm({ initialMessage }: { initialMessage?: SubscriptionMessage }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState(initialMessage ? initialMessages[initialMessage] : '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const form = new FormData(event.currentTarget)
    const website = String(form.get('website') || '')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Add a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/notes/subscribe', {
        body: JSON.stringify({ email, website }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Could not subscribe. Please try again.')

      setEmail('')
      setMessage('Check your inbox to confirm your subscription.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not subscribe. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="max-w-[760px] rounded-[16px] bg-background-alt p-6 tablet:p-8" id="email-updates" aria-labelledby="email-updates-heading">
      <h3 className="text-balance text-[24px] leading-[1.2] tablet:text-[30px]" id="email-updates-heading">
        Get new notes by email
      </h3>
      <p className="mt-3 text-pretty text-[16px] leading-[1.5] text-muted tablet:text-[18px]">
        No spam—just an email when there’s a new note to read.
      </p>

      <form className="mt-6 flex flex-col gap-3 tablet:flex-row" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor="notes-subscribe-email">Email address</label>
        <input
          aria-describedby={error ? 'notes-subscribe-error' : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="email"
          className="min-h-12 min-w-0 flex-1 rounded-[8px] border border-border bg-background px-4 text-[16px] text-content outline-none transition-colors placeholder:text-muted focus:border-border-strong"
          id="notes-subscribe-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          type="email"
          value={email}
        />
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="notes-subscribe-website">Website</label>
          <input id="notes-subscribe-website" name="website" tabIndex={-1} type="text" />
        </div>
        <button
          className="min-h-12 rounded-[8px] bg-content px-5 text-[16px] font-medium text-background transition-opacity hover:opacity-75 disabled:cursor-wait disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>

      <div className="mt-3 min-h-6 text-[14px] leading-6" aria-live="polite">
        {error ? <p className="text-red-600" id="notes-subscribe-error">{error}</p> : null}
        {!error && message ? <p className="text-muted">{message}</p> : null}
      </div>

      <a className="mt-2 inline-block text-[14px] text-muted underline underline-offset-4 transition-opacity hover:opacity-60" href="/notes/rss.xml">
        Or follow via RSS
      </a>
    </section>
  )
}

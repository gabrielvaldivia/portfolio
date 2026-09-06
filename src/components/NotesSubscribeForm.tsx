'use client'

import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
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

      <form className="mt-6" onSubmit={handleSubmit} noValidate>
        <div className="relative flex min-h-12 min-w-0 items-center border-b border-border">
          <label className="sr-only" htmlFor="notes-subscribe-email">Email address</label>
          <input
            aria-describedby={error ? 'notes-subscribe-error' : undefined}
            aria-invalid={Boolean(error)}
            autoComplete="email"
            className="w-full bg-transparent pr-12 text-left text-body text-content outline-none placeholder:text-muted"
            id="notes-subscribe-email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            type="email"
            value={email}
          />
          {email.length > 0 ? (
            <button
              aria-label="Subscribe to Notes"
              className="absolute right-0 flex size-10 cursor-pointer items-center justify-center rounded-full text-content transition-opacity duration-150 hover:opacity-60 disabled:cursor-default disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              <HugeiconsIcon aria-hidden="true" icon={ArrowRight02Icon} size={20} strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="notes-subscribe-website">Website</label>
          <input id="notes-subscribe-website" name="website" tabIndex={-1} type="text" />
        </div>
      </form>

      <div className="mt-3 text-center text-[14px] leading-6" aria-live="polite">
        {error ? <p className="text-red-600" id="notes-subscribe-error">{error}</p> : null}
        {!error && message ? <p className="text-muted">{message}</p> : null}
        <a className="inline-block text-muted underline underline-offset-4 transition-opacity hover:opacity-60" href="/notes/rss.xml">
          Or follow via RSS
        </a>
      </div>
    </section>
  )
}

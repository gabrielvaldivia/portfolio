'use client'

import { useId, useState, type FormEvent } from 'react'
import { cn } from '@/lib/cn'

export function NotesSubscribeForm({ layout = 'wide' }: { layout?: 'wide' | 'sidebar' }) {
  const id = useId()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting') return

    const form = event.currentTarget
    const fields = new FormData(form)
    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/notes/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(fields.get('email') || '').trim(),
          website: fields.get('website'),
        }),
      })
      const result = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Could not subscribe. Please try again.')
      }

      form.reset()
      setStatus('sent')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not subscribe. Please try again.')
      setStatus('idle')
    }
  }

  return (
    <section
      id="email-updates"
      aria-labelledby={`${id}-heading`}
      className={cn(
        '@container rounded-2xl border border-border bg-elevated p-6',
        layout === 'wide'
          ? 'mx-auto mt-16 max-w-[760px] tablet:p-8'
          : 'desktop:p-8',
      )}
    >
      <div className="grid gap-2 @lg:grid-cols-2 @lg:gap-8">
        <h2 id={`${id}-heading`} className="notes-list-heading text-balance text-text-strong">
          Get new notes by email
        </h2>

        <div className="@container min-w-0">
          <p id={`${id}-description`} className="text-pretty text-caption text-text-muted">
            I write about design, technology, and the things I’m figuring out along the way.
          </p>

          <form
            aria-label="Sign up for email updates"
            aria-describedby={`${id}-description`}
            aria-busy={status === 'submitting'}
            className="mt-8 grid gap-4"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-3 @3xs:flex-row @3xs:items-start">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Email address</span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Enter your email"
                  aria-describedby={error ? `${id}-error` : undefined}
                  disabled={status === 'submitting'}
                  onChange={() => {
                    setError('')
                    if (status === 'sent') setStatus('idle')
                  }}
                  className="min-h-11 w-full rounded-lg border border-border bg-background-alt px-3 py-2.5 text-base text-text-strong placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content disabled:opacity-50 tablet:text-caption"
                />
              </label>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="min-h-11 shrink-0 cursor-pointer rounded-full bg-content px-5 py-2.5 text-caption font-medium text-background hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content disabled:cursor-default disabled:opacity-50"
              >
                {status === 'submitting' ? 'Signing up…' : 'Sign up'}
              </button>
            </div>
            <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {error ? <p id={`${id}-error`} role="alert" className="text-pretty text-caption text-text-error">{error}</p> : null}
            {status === 'sent' ? <p role="status" className="text-pretty text-caption text-text-muted">Check your inbox to confirm your subscription.</p> : null}
          </form>
        </div>
      </div>
    </section>
  )
}

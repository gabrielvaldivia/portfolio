'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'

export function EngagementAccessForm() {
  const [emailValid, setEmailValid] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')

    try {
      const response = await fetch('/api/engagement-models/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), website: form.get('website') }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not open the page. Please try again.')
      // Reload from the server with the new cookie, including when JavaScript has cached the gate.
      window.location.reload()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not open the page. Please try again.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3" aria-busy={pending}>
      <label htmlFor="engagement-email" className="text-body text-text-strong">Enter email address to view</label>
      <div className="flex items-center gap-2 rounded-full border border-border-strong bg-background-alt py-1.5 pl-5 pr-1.5 focus-within:border-text-muted">
        <input
          id="engagement-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@example.com"
          aria-describedby={error ? 'engagement-email-error' : undefined}
          onChange={(event) => {
            setEmailValid(event.currentTarget.validity.valid)
            setError('')
          }}
          className="min-w-0 flex-1 bg-transparent py-2 text-body text-text-strong outline-none placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled={pending || !emailValid}
          aria-label={pending ? 'Opening engagement models' : 'View engagement models'}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-text-strong text-background hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-strong disabled:cursor-default disabled:opacity-30"
        >
          <ArrowRight className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && <p id="engagement-email-error" role="alert" className="text-pretty text-caption text-text-error">{error}</p>}
    </form>
  )
}

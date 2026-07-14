'use client'

import { useRef, useState, type FormEvent } from 'react'
import { cn } from '@/lib/cn'

type SubmitState = 'idle' | 'sending' | 'sent' | 'error'
type FieldName = 'fromEmail' | 'subject' | 'message'
type FieldErrors = Partial<Record<FieldName, string>>

export function ContactForm({ email }: { email: string }) {
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')

  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy'), 1500)
    } catch {
      setCopyLabel('Could not copy')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const fromEmail = String(formData.get('fromEmail') || '').trim()
    const subject = String(formData.get('subject') || '').trim()
    const message = String(formData.get('message') || '').trim()
    const nextFieldErrors: FieldErrors = {}

    if (!fromEmail) nextFieldErrors.fromEmail = 'Enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) nextFieldErrors.fromEmail = 'Use a valid email address.'
    if (!subject) nextFieldErrors.subject = 'Add a subject.'
    if (!message) nextFieldErrors.message = 'Add a message.'
    else if (message.length < 10) nextFieldErrors.message = 'Add a little more detail.'

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors)
      setSubmitState('idle')
      setError('')
      const firstInvalidField = (['fromEmail', 'subject', 'message'] as FieldName[])
        .find((field) => nextFieldErrors[field])
      const input = firstInvalidField ? form.elements.namedItem(firstInvalidField) : null
      if (input instanceof HTMLElement) input.focus()
      return
    }

    setFieldErrors({})
    setSubmitState('sending')
    setError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fromEmail,
          subject,
          message,
          website: formData.get('website'),
        }),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Could not send your message.')

      form.reset()
      messageRef.current?.style.removeProperty('height')
      setSubmitState('sent')
    } catch (submitError) {
      setSubmitState('error')
      setError(submitError instanceof Error ? submitError.message : 'Could not send your message.')
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col" aria-label="Contact form">
      <div className="grid grid-cols-6 items-baseline gap-x-4 border-b border-border pb-4">
        <span className="text-body text-muted">To</span>
        <div className="col-span-5 flex w-full min-w-0 items-baseline gap-3 text-left">
          <span className="truncate text-body">{email}</span>
          <button
            type="button"
            onClick={copyEmail}
            className="ml-auto shrink-0 cursor-pointer text-caption text-muted transition-colors duration-150 hover:text-content"
          >
            {copyLabel}
          </button>
        </div>
      </div>

      <label className={cn(
        'grid grid-cols-6 items-baseline gap-x-4 border-b py-4',
        fieldErrors.fromEmail ? 'border-red-500/50' : 'border-border',
      )}>
        <span className="text-body text-muted">From</span>
        <input
          name="fromEmail"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldErrors.fromEmail)}
          aria-describedby={fieldErrors.fromEmail ? 'contact-from-error' : undefined}
          onChange={() => clearFieldError('fromEmail')}
          className="col-span-5 w-full bg-transparent text-left text-body text-content outline-none placeholder:text-muted"
        />
        {fieldErrors.fromEmail && (
          <span id="contact-from-error" className="col-span-5 col-start-2 mt-2 text-caption text-red-600 dark:text-red-400">
            {fieldErrors.fromEmail}
          </span>
        )}
      </label>

      <label className={cn(
        'grid grid-cols-6 items-baseline gap-x-4 border-b py-4',
        fieldErrors.subject ? 'border-red-500/50' : 'border-border',
      )}>
        <span className="text-body text-muted">Subject</span>
        <input
          name="subject"
          type="text"
          required
          maxLength={160}
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
          onChange={() => clearFieldError('subject')}
          className="col-span-5 w-full bg-transparent text-left text-body text-content outline-none placeholder:text-muted"
        />
        {fieldErrors.subject && (
          <span id="contact-subject-error" className="col-span-5 col-start-2 mt-2 text-caption text-red-600 dark:text-red-400">
            {fieldErrors.subject}
          </span>
        )}
      </label>

      <label className="pt-4">
        <span className="sr-only">Message</span>
        <textarea
          ref={messageRef}
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={4}
          placeholder="Message"
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
          onInput={(event) => {
            clearFieldError('message')
            const textarea = event.currentTarget
            textarea.style.height = 'auto'
            textarea.style.height = `${textarea.scrollHeight}px`
          }}
          className="block w-full resize-none overflow-hidden bg-transparent text-left text-body text-content outline-none placeholder:text-muted"
        />
        {fieldErrors.message && (
          <span id="contact-message-error" className="mt-2 block text-caption text-red-600 dark:text-red-400">
            {fieldErrors.message}
          </span>
        )}
      </label>

      <input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={submitState === 'sending'}
          className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-body transition-colors duration-150 hover:bg-background-alt disabled:cursor-default disabled:opacity-50"
        >
          {submitState === 'sending' ? 'Sending…' : 'Send'}
        </button>
        {submitState === 'sent' && <p className="text-caption text-muted" role="status">Message sent.</p>}
        {submitState === 'error' && <p className="text-caption text-red-600 dark:text-red-400" role="alert">{error}</p>}
      </div>
    </form>
  )
}

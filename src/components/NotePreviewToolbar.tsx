'use client'

import { Check, Link as LinkIcon } from 'lucide-react'
import { useState } from 'react'

export function NotePreviewToolbar({ expiresAt }: { expiresAt: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5 text-caption tablet:px-10">
      <div>
        <p className="font-medium">Preview</p>
        <p className="mt-1 text-text-muted">Anyone with this link can view the latest saved version. Expires {expiresAt}.</p>
      </div>
      <div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 hover:bg-background-alt focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
          onClick={() => { void copyLink() }}
          type="button"
        >
          {copyState === 'copied' ? <Check className="size-4" aria-hidden="true" /> : <LinkIcon className="size-4" aria-hidden="true" />}
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
        <p role="status" className="text-text-muted">
          {copyState === 'failed' ? 'Copy the link from your address bar.' : copyState === 'copied' ? <span className="sr-only">Preview link copied.</span> : null}
        </p>
      </div>
    </header>
  )
}

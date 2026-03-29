'use client'

import { useState, useEffect } from 'react'

export function FloatingPill({
  enabled,
  text,
  buttonLabel,
  buttonLink,
  onDismiss,
}: {
  enabled: boolean
  text: string
  buttonLabel: string
  buttonLink: string
  onDismiss?: () => void
}) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (enabled && !dismissed) {
      document.body.classList.add('birthday-donation-visible')
    } else {
      document.body.classList.remove('birthday-donation-visible')
    }
    return () => document.body.classList.remove('birthday-donation-visible')
  }, [enabled, dismissed])

  if (!enabled || !text || dismissed) return null

  return (
    <div id="birthday-donation" className="fixed bottom-0 left-0 right-0 tablet:bottom-6 tablet:left-1/2 tablet:right-auto tablet:-translate-x-1/2 z-[101] flex items-center justify-center gap-3 bg-background/80 dark:bg-white/10 backdrop-blur-xl rounded-none tablet:rounded-full px-5 py-4 tablet:py-3" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.08)' }}>
      <span className="text-sm text-muted flex-1">
        {text}
      </span>
      {buttonLabel && buttonLink && (
        <a
          href={buttonLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-content bg-content/10 hover:bg-content/20 transition-colors rounded-full px-4 py-1.5 shrink-0"
        >
          {buttonLabel}
        </a>
      )}
      <button
        onClick={() => { setDismissed(true); onDismiss?.() }}
        className="text-muted hover:text-content transition-colors ml-1 shrink-0"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  )
}

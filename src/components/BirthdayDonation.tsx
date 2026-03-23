'use client'

import { useState, useEffect } from 'react'

export function BirthdayDonation() {
  const [dismissed, setDismissed] = useState(false)

  const today = new Date()
  const isBirthday = today.getMonth() === 2 && today.getDate() === 23

  useEffect(() => {
    if (isBirthday && !dismissed) {
      document.body.classList.add('birthday-donation-visible')
    } else {
      document.body.classList.remove('birthday-donation-visible')
    }
    return () => document.body.classList.remove('birthday-donation-visible')
  }, [isBirthday, dismissed])

  if (!isBirthday || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 tablet:bottom-6 tablet:left-1/2 tablet:right-auto tablet:-translate-x-1/2 z-[60] flex items-center justify-center gap-3 bg-background/80 backdrop-blur-xl rounded-none tablet:rounded-full px-5 py-4 tablet:py-3 " style={{ boxShadow: '0 0 20px rgba(0,0,0,0.08)' }}>
      <span className="text-sm text-muted">
        It&apos;s my birthday! Help me support immigrant children
      </span>
      <a
        href="https://gofund.me/8ccd17bde"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-content bg-content/10 hover:bg-content/20 transition-colors rounded-full px-4 py-1.5 shrink-0"
      >
        Donate to KIND
      </a>
      <button
        onClick={() => setDismissed(true)}
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

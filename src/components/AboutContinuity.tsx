'use client'

import Link from 'next/link'
import { useLayoutEffect, useRef, useState, ViewTransition, type ReactNode } from 'react'

let pendingAboutPosition: { top: number; startedAt: number } | null = null

/** Keep the bio anchored in the viewport when opening the full About page. */
export function AboutContinuity({ children, full = false }: { children: ReactNode; full?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [expanded] = useState(() => full && Boolean(pendingAboutPosition))

  useLayoutEffect(() => {
    if (!ref.current) return
    if (!full || !pendingAboutPosition) return
    const position = pendingAboutPosition
    pendingAboutPosition = null
    if (performance.now() - position.startedAt > 60000) return

    const top = window.scrollY + ref.current.getBoundingClientRect().top - position.top
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
    ref.current.focus({ preventScroll: true })
  }, [full])

  return (
    <div ref={ref} data-about-expanded={expanded || undefined} role={full ? 'region' : undefined} data-about-intro={full ? 'full' : 'preview'} tabIndex={full ? -1 : undefined} className="outline-none" aria-label={full ? 'About Gabriel Valdivia' : undefined}>
      {children}
    </div>
  )
}

export function AboutSharedElement({ children, name }: { children: ReactNode; name: 'portrait' | 'bio' }) {
  return (
    <ViewTransition name={`about-${name}`} share="about-continuity" default="none">
      {children}
    </ViewTransition>
  )
}

export function AboutReadMore() {
  return (
    <Link
      href="/about"
      prefetch
      scroll={false}
      transitionTypes={['expand-about']}
      onNavigate={() => {
        const intro = document.querySelector('[data-about-intro="preview"]')
        pendingAboutPosition = intro ? { top: intro.getBoundingClientRect().top, startedAt: performance.now() } : null
      }}
      className="mt-8 inline-flex items-center gap-2 text-body-large text-text-body transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
    >
      Read more
      <svg aria-hidden="true" className="size-6 shrink-0 translate-y-px" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </Link>
  )
}

'use client'

import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

/** Count up once on reveal, reserving the final number's width throughout. */
export function NoteActivityCount({ value, reveal, compact = false, hideZero = false, className }: {
  value: number | null
  reveal: boolean
  compact?: boolean
  hideZero?: boolean
  className?: string
}) {
  const textRef = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  const reducedMotion = useReducedMotion()
  const format = (count: number) => count.toLocaleString('en-US', compact ? { notation: 'compact' } : undefined)
  const finalText = value === null ? '—' : format(value)

  useEffect(() => {
    const text = textRef.current
    if (!text) return
    if (!reveal) { text.textContent = '0'; return }
    if (started.current || reducedMotion || value === null || value === 0) {
      text.textContent = finalText
      return
    }
    started.current = true
    const animation = animate(0, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => { text.textContent = Math.floor(latest).toLocaleString('en-US', compact ? { notation: 'compact' } : undefined) },
      onComplete: () => { text.textContent = finalText },
    })
    return () => animation.stop()
  }, [value, reveal, compact, reducedMotion, finalText])

  return (
    <span data-note-count aria-hidden="true" className={cn('relative inline-grid min-w-[1ch] font-mono tabular-nums text-text-muted', hideZero && value === 0 && 'invisible', className)}>
      <span className="invisible col-start-1 row-start-1">{finalText}</span>
      <span ref={textRef} data-note-count-value className="col-start-1 row-start-1">0</span>
    </span>
  )
}

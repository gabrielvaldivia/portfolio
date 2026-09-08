'use client'

import { useAnimationFrame, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

function getMaximumScroll() {
  return Math.max(0, getScrollingElement().scrollHeight - window.innerHeight)
}

function getScrollingElement() {
  return document.scrollingElement ?? document.documentElement
}

export function CreditsPlaybackControl() {
  const prefersReducedMotion = useReducedMotion()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion !== false) return

    const audio = audioRef.current
    if (!audio) return

    void audio.play().catch(() => {
      setIsPlaying(false)
    })

    return () => audio.pause()
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!isPlaying) return

    const root = document.documentElement
    const previousCreditsPlaying = root.getAttribute('data-credits-playing')

    root.setAttribute('data-credits-playing', 'true')

    const preventScroll = (event: Event) => event.preventDefault()
    const preventKeyboardScroll = (event: KeyboardEvent) => {
      const target = event.target

      if (
        target instanceof Element &&
        target.closest('input, textarea, select, button, a, [contenteditable="true"]')
      ) {
        return
      }

      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
        event.preventDefault()
      }
    }

    window.addEventListener('wheel', preventScroll, { passive: false })
    window.addEventListener('touchmove', preventScroll, { passive: false })
    window.addEventListener('keydown', preventKeyboardScroll)

    return () => {
      if (previousCreditsPlaying === null) {
        root.removeAttribute('data-credits-playing')
      } else {
        root.setAttribute('data-credits-playing', previousCreditsPlaying)
      }

      window.removeEventListener('wheel', preventScroll)
      window.removeEventListener('touchmove', preventScroll)
      window.removeEventListener('keydown', preventKeyboardScroll)
    }
  }, [isPlaying])

  useAnimationFrame(() => {
    if (!isPlaying) return

    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return

    const maximumScroll = getMaximumScroll()
    const progress = Math.min(1, Math.max(0, audio.currentTime / audio.duration))
    const nextScroll = maximumScroll * progress
    window.scrollTo({ top: nextScroll, behavior: 'instant' })
  })

  const label = isPlaying ? 'Pause credits' : 'Play credits'

  return (
    <>
      <audio
        ref={audioRef}
        id="credits-soundtrack"
        src="/audio/credits-exit-music.mp3"
        preload="auto"
        hidden
        onPlaying={() => setIsPlaying(true)}
        onWaiting={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          window.scrollTo({ top: getMaximumScroll(), behavior: 'instant' })
          setIsPlaying(false)
        }}
      />
      <div
        data-credits-playback-control
        className="pointer-events-none sticky bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 flex justify-start px-4 tablet:px-10"
      >
        <button
          type="button"
          aria-controls="credits-soundtrack"
          aria-label={label}
          title={label}
          className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-full bg-floating text-text-strong backdrop-blur-[40px] transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
          onClick={() => {
            const audio = audioRef.current
            if (!audio) return

            if (isPlaying) {
              audio.pause()
              return
            }

            const maximumScroll = getMaximumScroll()

            if (window.scrollY >= maximumScroll - 1 || audio.ended) {
              window.scrollTo({ top: 0, behavior: 'instant' })
              audio.currentTime = 0
            } else if (
              maximumScroll > 0 &&
              Number.isFinite(audio.duration) &&
              audio.duration > 0
            ) {
              const expectedScroll = maximumScroll * (audio.currentTime / audio.duration)

              if (Math.abs(window.scrollY - expectedScroll) > 2) {
                audio.currentTime = (window.scrollY / maximumScroll) * audio.duration
              }
            }

            void audio.play().catch(() => {
              setIsPlaying(false)
            })
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="currentColor">
            {isPlaying ? (
              <>
                <rect x="4" y="3" width="4" height="14" rx="1" />
                <rect x="12" y="3" width="4" height="14" rx="1" />
              </>
            ) : (
              <path d="M6 4.5v11l9-5.5-9-5.5Z" />
            )}
          </svg>
        </button>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'

export function OverlayEffects({ overlay, colorMode = 'both' }: { overlay: string; colorMode?: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || overlay === 'none') return null

  const modeClass = colorMode === 'light' ? 'light-only' : colorMode === 'dark' ? 'dark-only' : ''

  if (overlay === 'shadows') {
    return (
      <div
        className={`fixed inset-0 z-[100] pointer-events-none ${modeClass}`}
        style={{
          mixBlendMode: 'multiply',
          opacity: 0.15,
        }}
      >
        <video
          src="/shadow-overlay-loop.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{
            filter: 'var(--shadow-filter, none)',
          }}
        />
      </div>
    )
  }

  if (overlay === 'aurora') {
    return (
      <div
        className={`fixed inset-0 z-[100] pointer-events-none ${modeClass}`}
        style={{
          mixBlendMode: 'screen',
          opacity: 0.4,
          maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 75%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 75%)',
        }}
      >
        <video
          src="/aurora-overlay-loop.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover object-top"
        />
      </div>
    )
  }

if (overlay === 'stars') {
    return (
      <div
        className={`fixed inset-0 z-[100] pointer-events-none ${modeClass}`}
        style={{
          mixBlendMode: 'screen',
          opacity: 0.4,
        }}
      >
        <video
          src="/stars-overlay-loop.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return null
}

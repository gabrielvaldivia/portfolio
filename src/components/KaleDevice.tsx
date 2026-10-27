'use client'

import { useEffect, useRef, useState } from 'react'
import { LazyVideo } from '@/components/LazyVideo'
import type { KaleCaseColor } from '@/components/kaleScene'
import { cn } from '@/lib/cn'

// Checked once per page, releasing the test context straight away: browsers (iOS
// especially) cap how many WebGL contexts a page may hold.
let webGLSupport: boolean | null = null
function supportsWebGL() {
  if (webGLSupport !== null) return webGLSupport
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    webGLSupport = Boolean(context)
  } catch {
    webGLSupport = false
  }
  return webGLSupport
}

export type KaleScreenSource = { url: string; width: number }

// The smallest image that stays sharp on the screen, which spans about 70% of the stage.
function pickScreenSource(src: string, sources: KaleScreenSource[] | undefined, stageWidth: number, compact: boolean) {
  if (!sources?.length) return src
  const needed = stageWidth * Math.min(window.devicePixelRatio, compact ? 1.5 : 2) * 0.7
  const sorted = [...sources].sort((a, b) => a.width - b.width)
  return (sorted.find((source) => source.width >= needed) || sorted[sorted.length - 1]).url
}

export function KaleDevice({
  src,
  sources,
  isVideo,
  alt,
  caseColor = 'chalk',
}: {
  src: string
  sources?: KaleScreenSource[]
  isVideo: boolean
  alt?: string
  caseColor?: KaleCaseColor
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  // A new array arrives on each render; restart the scene only when the URLs change.
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources
  const sourcesKey = sources?.map((source) => source.url).join('|') ?? ''
  const [status, setStatus] = useState<'idle' | 'ready' | 'failed'>('idle')

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !supportsWebGL()) {
      setStatus('failed')
      return
    }

    let dispose: (() => void) | undefined
    let cancelled = false

    // Three.js and the model only load once the module is close to the viewport.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      import('@/components/kaleScene').then(({ createKaleScene }) => {
        if (cancelled) return
        const compact = window.matchMedia('(max-width: 809px), (pointer: coarse)').matches
        const screenSrc = isVideo ? src : pickScreenSource(src, sourcesRef.current, stage.clientWidth, compact)
        dispose = createKaleScene({
          container: stage,
          media: { src: screenSrc, isVideo },
          caseColor,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          onReady: () => setStatus('ready'),
          onError: () => setStatus('failed'),
        })
      }).catch(() => setStatus('failed'))
    }, { rootMargin: '800px 0px' })
    observer.observe(stage)

    return () => {
      cancelled = true
      observer.disconnect()
      dispose?.()
    }
  }, [src, sourcesKey, isVideo, caseColor])

  const ready = status === 'ready'

  return (
    <div className="relative h-full w-full">
      {/* The flat screen only stands in when the 3D tablet can't render. */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[78%] overflow-hidden rounded-[3%/4.6%] bg-[#111513] p-[2.2%] shadow-lg" style={{ aspectRatio: '255 / 166' }}>
            <div className="relative h-full w-full overflow-hidden rounded-[1%/1.6%]">
              {isVideo ? (
                <LazyVideo src={src} className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={alt || ''} className="w-full object-cover" style={{ height: '100%' }} />
              )}
            </div>
          </div>
        </div>
      )}
      <div
        ref={stageRef}
        // Dragging spins the tablet, so the lightbox shouldn't treat it as a swipe.
        data-lightbox-interactive=""
        role="img"
        aria-label={alt ? `${alt}, shown on a Kale tablet. Drag to turn it around.` : 'Kale tablet. Drag to turn it around.'}
        className={cn('absolute inset-0 transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { LazyVideo } from '@/components/LazyVideo'
import type { KaleCaseColor } from '@/components/kaleScene'
import { cn } from '@/lib/cn'

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function KaleDevice({
  src,
  isVideo,
  alt,
  caseColor = 'chalk',
}: {
  src: string
  isVideo: boolean
  alt?: string
  caseColor?: KaleCaseColor
}) {
  const stageRef = useRef<HTMLDivElement>(null)
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
        dispose = createKaleScene({
          container: stage,
          media: { src, isVideo },
          caseColor,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          onReady: () => setStatus('ready'),
          onError: () => setStatus('failed'),
        })
      }).catch(() => setStatus('failed'))
    }, { rootMargin: '400px 0px' })
    observer.observe(stage)

    return () => {
      cancelled = true
      observer.disconnect()
      dispose?.()
    }
  }, [src, isVideo, caseColor])

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
        role="img"
        aria-label={alt ? `${alt}, shown on a Kale tablet. Drag to turn it around.` : 'Kale tablet. Drag to turn it around.'}
        className={cn('absolute inset-0 transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}

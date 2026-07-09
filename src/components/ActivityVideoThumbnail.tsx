'use client'

import { useEffect, useMemo, useRef } from 'react'

const FIRST_FRAME_TIME = 0.001

function getFirstFrameSrc(src: string) {
  const trimmed = src.trim()
  if (!trimmed) return ''

  const hashIndex = trimmed.indexOf('#')
  const baseSrc = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed

  return `${baseSrc}#t=${FIRST_FRAME_TIME}`
}

export function ActivityVideoThumbnail({ src, className = '' }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const firstFrameSrc = useMemo(() => getFirstFrameSrc(src), [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !firstFrameSrc) return

    let cancelled = false
    let started = false
    let observer: IntersectionObserver | null = null

    const seekToFirstFrame = () => {
      if (cancelled) return

      video.pause()

      const duration = video.duration
      const targetTime = Number.isFinite(duration) && duration > 0
        ? Math.min(FIRST_FRAME_TIME, Math.max(duration - FIRST_FRAME_TIME, 0))
        : FIRST_FRAME_TIME

      try {
        if (Math.abs(video.currentTime - targetTime) > 0.0001) {
          video.currentTime = targetTime
        }
      } catch {
        // Some browsers reject tiny seeks before enough video data is available.
      }
    }

    const loadFirstFrame = () => {
      if (cancelled || started) return

      started = true
      video.src = firstFrameSrc
      video.load()

      if (video.readyState >= 1) {
        seekToFirstFrame()
      }
    }

    video.addEventListener('loadedmetadata', seekToFirstFrame)
    video.addEventListener('loadeddata', seekToFirstFrame)
    video.addEventListener('canplay', seekToFirstFrame)

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            loadFirstFrame()
            observer?.disconnect()
          }
        },
        { rootMargin: '300px' },
      )
      observer.observe(video)
    } else {
      loadFirstFrame()
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      video.removeEventListener('loadedmetadata', seekToFirstFrame)
      video.removeEventListener('loadeddata', seekToFirstFrame)
      video.removeEventListener('canplay', seekToFirstFrame)
    }
  }, [firstFrameSrc])

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      className={className}
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}

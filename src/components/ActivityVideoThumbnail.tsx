'use client'

import { useEffect, useMemo, useRef } from 'react'

const MIN_FRAME_TIME = 0.001
const MIDDLE_FRAME_START_RATIO = 0.25
const MIDDLE_FRAME_END_RATIO = 0.75

function getVideoSrc(src: string) {
  const trimmed = src.trim()
  if (!trimmed) return ''

  const hashIndex = trimmed.indexOf('#')

  return hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed
}

function getRandomMiddleFrameTime(duration: number) {
  if (!Number.isFinite(duration) || duration <= MIN_FRAME_TIME) return MIN_FRAME_TIME

  const start = duration * MIDDLE_FRAME_START_RATIO
  const end = duration * MIDDLE_FRAME_END_RATIO
  const randomTime = start + Math.random() * (end - start)
  const latestSafeTime = Math.max(duration - MIN_FRAME_TIME, MIN_FRAME_TIME)

  return Math.min(Math.max(randomTime, MIN_FRAME_TIME), latestSafeTime)
}

export function ActivityVideoThumbnail({ src, className = '' }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoSrc = useMemo(() => getVideoSrc(src), [src])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return

    let cancelled = false
    let started = false
    let targetTime: number | null = null
    let observer: IntersectionObserver | null = null

    const seekToRandomMiddleFrame = () => {
      if (cancelled) return

      video.pause()

      targetTime ??= getRandomMiddleFrameTime(video.duration)

      try {
        if (Math.abs(video.currentTime - targetTime) > 0.0001) {
          video.currentTime = targetTime
        }
      } catch {
        // Some browsers reject seeks before enough video data is available.
      }
    }

    const loadRandomMiddleFrame = () => {
      if (cancelled || started) return

      started = true
      video.src = videoSrc
      video.load()

      if (video.readyState >= 1) {
        seekToRandomMiddleFrame()
      }
    }

    video.addEventListener('loadedmetadata', seekToRandomMiddleFrame)
    video.addEventListener('loadeddata', seekToRandomMiddleFrame)
    video.addEventListener('canplay', seekToRandomMiddleFrame)

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            loadRandomMiddleFrame()
            observer?.disconnect()
          }
        },
        { rootMargin: '300px' },
      )
      observer.observe(video)
    } else {
      loadRandomMiddleFrame()
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      video.removeEventListener('loadedmetadata', seekToRandomMiddleFrame)
      video.removeEventListener('loadeddata', seekToRandomMiddleFrame)
      video.removeEventListener('canplay', seekToRandomMiddleFrame)
    }
  }, [videoSrc])

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

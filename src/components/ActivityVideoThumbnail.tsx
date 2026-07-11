'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

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

export function ActivityVideoThumbnail({
  src,
  className = '',
  playOnHover = false,
}: {
  src: string
  className?: string
  playOnHover?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasLoadedVideoRef = useRef(false)
  const isHoveringRef = useRef(false)
  const targetTimeRef = useRef<number | null>(null)
  const videoSrc = useMemo(() => getVideoSrc(src), [src])

  const loadVideo = useCallback(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return

    if (hasLoadedVideoRef.current) return

    hasLoadedVideoRef.current = true
    video.src = videoSrc
    video.load()
  }, [videoSrc])

  const seekToRandomMiddleFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || (playOnHover && isHoveringRef.current)) return

    video.pause()

    targetTimeRef.current ??= getRandomMiddleFrameTime(video.duration)

    try {
      if (Math.abs(video.currentTime - targetTimeRef.current) > 0.0001) {
        video.currentTime = targetTimeRef.current
      }
    } catch {
      // Some browsers reject seeks before enough video data is available.
    }
  }, [playOnHover])

  function handlePointerEnter() {
    if (!playOnHover) return

    const video = videoRef.current
    if (!video) return

    isHoveringRef.current = true
    loadVideo()

    void video.play().catch(() => {
      // Muted hover playback can still be rejected by browser policy.
    })
  }

  function handlePointerLeave() {
    if (!playOnHover) return

    isHoveringRef.current = false
    seekToRandomMiddleFrame()
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return

    let cancelled = false
    let observer: IntersectionObserver | null = null

    hasLoadedVideoRef.current = false
    isHoveringRef.current = false
    targetTimeRef.current = null

    const loadRandomMiddleFrame = () => {
      if (cancelled) return

      loadVideo()

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
  }, [loadVideo, seekToRandomMiddleFrame, videoSrc])

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      className={className}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}

'use client'

import { useRef, useEffect, useCallback } from 'react'

export function VideoPlayer({ src, loop = true, muted = true, controls = false, className = '' }: {
  src: string
  loop?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isDesktop = useRef(false)

  useEffect(() => {
    isDesktop.current = window.matchMedia('(hover: hover)').matches
  }, [])

  // Mobile: autoplay when in view
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!isDesktop.current) {
          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (isDesktop.current) {
      videoRef.current?.play().catch(() => {})
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDesktop.current) {
      videoRef.current?.pause()
    }
  }, [])

  return (
    <video
      ref={videoRef}
      src={src}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  )
}

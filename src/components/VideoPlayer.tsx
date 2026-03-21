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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (controls && videoRef.current) {
      videoRef.current.controls = true
    }
  }, [controls])

  const handleMouseLeave = useCallback(() => {
    if (controls && videoRef.current) {
      videoRef.current.controls = false
    }
  }, [controls])

  return (
    <video
      ref={videoRef}
      src={src}
      loop={loop}
      muted={muted}
      playsInline
      preload="none"
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  )
}

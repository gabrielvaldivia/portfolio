'use client'

import { useRef, useEffect } from 'react'

export function LazyVideo({ src, className = '' }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !motionQuery.matches) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.3 }
    )

    const handleMotionPreference = () => {
      if (motionQuery.matches) video.pause()
      else if (video.getBoundingClientRect().bottom > 0 && video.getBoundingClientRect().top < window.innerHeight) {
        video.play().catch(() => {})
      }
    }

    observer.observe(video)
    motionQuery.addEventListener('change', handleMotionPreference)
    return () => {
      observer.disconnect()
      motionQuery.removeEventListener('change', handleMotionPreference)
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      preload="metadata"
      className={`block ${className}`}
    />
  )
}

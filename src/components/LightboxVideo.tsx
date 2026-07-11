'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

export function LightboxVideo({
  src,
  active,
  aspectRatio,
  className = '',
}: {
  src: string
  active?: boolean
  aspectRatio?: number
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [metadataAspectRatio, setMetadataAspectRatio] = useState<number | null>(null)
  const stableAspectRatio = aspectRatio || metadataAspectRatio || undefined
  const aspectRatioStyle: CSSProperties | undefined = stableAspectRatio
    ? { aspectRatio: stableAspectRatio }
    : undefined

  useEffect(() => {
    if (!active) {
      videoRef.current?.pause()
    }
  }, [active])

  useEffect(() => {
    setMetadataAspectRatio(null)
  }, [src])

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (!video || aspectRatio) return

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setMetadataAspectRatio(video.videoWidth / video.videoHeight)
    }
  }, [aspectRatio])

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      playsInline
      preload="metadata"
      style={aspectRatioStyle}
      onLoadedMetadata={handleLoadedMetadata}
      className={`block ${className}`}
    />
  )
}

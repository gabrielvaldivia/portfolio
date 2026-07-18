'use client'

import { useCallback, useEffect, useState, type CSSProperties, type SyntheticEvent } from 'react'
import { VideoPlayer } from '@/components/VideoPlayer'

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
  const [metadataAspectRatio, setMetadataAspectRatio] = useState<number | null>(null)
  const stableAspectRatio = aspectRatio || metadataAspectRatio || undefined
  const aspectRatioStyle: CSSProperties | undefined = stableAspectRatio
    ? { aspectRatio: stableAspectRatio }
    : undefined

  useEffect(() => {
    setMetadataAspectRatio(null)
  }, [src])

  const handleLoadedMetadata = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (!video || aspectRatio) return

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setMetadataAspectRatio(video.videoWidth / video.videoHeight)
    }
  }, [aspectRatio])

  return (
    <VideoPlayer
      src={src}
      controls
      loop={false}
      muted={false}
      active={active}
      style={aspectRatioStyle}
      onLoadedMetadata={handleLoadedMetadata}
      className={className}
    />
  )
}

'use client'

import { Maximize2, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { motion, useAnimationFrame, useMotionValue } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import { cn } from '@/lib/cn'
import { useOpenModuleLightbox } from '@/components/ModuleLightboxControlContext'

function formatVideoTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function VideoPlayer({
  src,
  loop = true,
  muted = true,
  controls = false,
  active = true,
  className = '',
  style,
  backgroundColor,
  onLoadedMetadata,
}: {
  src: string
  loop?: boolean
  muted?: boolean
  controls?: boolean
  active?: boolean
  className?: string
  style?: CSSProperties
  backgroundColor?: CSSProperties['backgroundColor']
  onLoadedMetadata?: (event: SyntheticEvent<HTMLVideoElement>) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const openLightbox = useOpenModuleLightbox()
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const smoothProgress = useMotionValue(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && active) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [active])

  useEffect(() => {
    if (!active) videoRef.current?.pause()
  }, [active])

  // Follow the module's muted setting when it changes (for example in the admin preview).
  useEffect(() => {
    setIsMuted(muted)
  }, [muted])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = isMuted
    video.volume = volume
  }, [isMuted, volume])

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      // Unmuting at zero volume would stay silent, so restore an audible level.
      if (current && volume === 0) setVolume(1)
      return !current
    })
  }, [volume])

  const changeVolume = useCallback((nextVolume: number) => {
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
  }, [])

  const togglePlayback = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [])

  const updateProgress = useCallback(() => {
    // Progress is only shown by the controls; skip the re-renders without them.
    if (!controls) return
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      setProgress(0)
      setCurrentTime(0)
      smoothProgress.set(0)
      return
    }

    const nextProgress = Math.min(1, Math.max(0, video.currentTime / video.duration))
    setCurrentTime(video.currentTime)
    setProgress(nextProgress)
    smoothProgress.set(nextProgress)
  }, [controls, smoothProgress])

  useAnimationFrame(() => {
    if (!isPlaying || !controls) return

    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    smoothProgress.set(Math.min(1, Math.max(0, video.currentTime / video.duration)))
  })

  return (
    <div ref={rootRef} className="video-player-group relative h-full w-full overflow-hidden bg-black" style={{ backgroundColor }}>
      <video
        ref={videoRef}
        src={src}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        style={style}
        className={cn('block', className)}
        onLoadedMetadata={(event) => {
          updateProgress()
          onLoadedMetadata?.(event)
        }}
        onDurationChange={updateProgress}
        onTimeUpdate={updateProgress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          updateProgress()
        }}
      />

      {controls && (
        <div className="video-player-controls pointer-events-none absolute inset-0 z-10 transition-opacity duration-150">
          <button
            type="button"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className="pointer-events-auto absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-text-on-media-strong transition-colors duration-150 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            onClick={(event) => {
              event.stopPropagation()
              togglePlayback()
            }}
          >
            {isPlaying ? <Pause aria-hidden="true" size={22} strokeWidth={2} fill="currentColor" /> : <Play aria-hidden="true" size={22} strokeWidth={2} fill="currentColor" />}
          </button>

          <button
            type="button"
            aria-label="Open video in lightbox"
            className="video-open-lightbox-button pointer-events-auto absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-text-on-media-strong transition-colors duration-150 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            onClick={(event) => {
              event.stopPropagation()
              openLightbox?.()
            }}
          >
            <Maximize2 aria-hidden="true" size={20} strokeWidth={2} />
          </button>

          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            <div
              className="group/volume pointer-events-auto inline-flex h-8 items-center rounded-full bg-black/60 text-text-on-media-strong backdrop-blur-sm"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                aria-label="Volume"
                style={{ '--video-volume': `${(isMuted ? 0 : volume) * 100}%` } as CSSProperties}
                className="video-volume-slider h-8 w-0 cursor-pointer opacity-0 transition-[width,margin,opacity] duration-150 group-hover/volume:ml-3 group-hover/volume:w-16 group-hover/volume:opacity-100 group-focus-within/volume:ml-3 group-focus-within/volume:w-16 group-focus-within/volume:opacity-100"
                onChange={(event) => changeVolume(Number(event.target.value))}
              />
              <button
                type="button"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                aria-pressed={isMuted}
                className="flex size-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={toggleMuted}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX aria-hidden="true" size={16} strokeWidth={2} />
                ) : volume < 0.5 ? (
                  <Volume1 aria-hidden="true" size={16} strokeWidth={2} />
                ) : (
                  <Volume2 aria-hidden="true" size={16} strokeWidth={2} />
                )}
              </button>
            </div>

            <div className="inline-flex h-8 items-center rounded-full bg-black/60 px-2.5 text-caption font-medium tabular-nums text-text-on-media-strong backdrop-blur-sm">
              {formatVideoTime(currentTime)}
            </div>
          </div>

          <div
            role="progressbar"
            aria-label="Video progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="absolute inset-x-0 bottom-0 h-0.5 bg-black/30 dark:bg-white/30"
          >
            <motion.div
              className="h-full origin-left bg-black dark:bg-white"
              style={{ scaleX: smoothProgress }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { cn } from '@/lib/cn'
import {
  MAX_MODULE_LIKES_PER_VISITOR,
  SUPER_MODULE_LIKE_AMOUNT,
  type ModuleLikeData,
} from '@/lib/moduleLikes'

const SUPER_LIKE_HOLD_MS = 3000
const SUPER_LIKE_CHARGE_DELAY_MS = 220
const SUPER_LIKE_POP_MS = 360
const SUPER_LIKE_BONUS_MS = 820
const CLICK_SUPPRESSION_MS = 700
const HEART_ICON_SIZE = 18
const SUPER_HEART_SIZE = 64
const SUPER_LIKE_COUNT_STEP_MS = 70
const MAX_MODULE_LIKE_BATCH_IDS = 80
const SUPER_LIKE_CHARGE_DURATION_SECONDS =
  (SUPER_LIKE_HOLD_MS - SUPER_LIKE_CHARGE_DELAY_MS) / 1000
const SUPER_HEART_SHAKE_X = [
  0, -0.8, 0.8, -1, 1, -1.2, 1.2, -1.45, 1.45, -1.7, 1.7, -1.95, 1.95,
  -2.2, 2.2, -2.45, 2.45, -2.7, 2.7, -2.95, 2.95, -3.15, 3.15, -3.3, 3.3,
]
const SUPER_HEART_SHAKE_ROTATE = [
  0, -1.8, 1.8, -2.2, 2.2, -2.6, 2.6, -3, 3, -3.4, 3.4, -3.8, 3.8, -4.2,
  4.2, -4.6, 4.6, -5, 5, -5.3, 5.3, -5.6, 5.6, -5.8, 5.8,
]
const SUPER_HEART_SHAKE_TIMES = SUPER_HEART_SHAKE_X.map((_, index) => {
  const progress = index / (SUPER_HEART_SHAKE_X.length - 1)
  return 1 - (1 - progress) ** 1.65
})

const emptyLikeData: ModuleLikeData = {
  count: 0,
  userLikes: 0,
  hasLiked: false,
  canLike: true,
}

type PendingLikeLoad = {
  resolve: (data: ModuleLikeData) => void
  reject: (error: Error) => void
}

const pendingLikeLoads = new Map<string, PendingLikeLoad[]>()
let pendingLikeLoadTimer: ReturnType<typeof setTimeout> | null = null

function requestModuleLikeData(targetId: string) {
  return new Promise<ModuleLikeData>((resolve, reject) => {
    const existing = pendingLikeLoads.get(targetId) || []
    existing.push({ resolve, reject })
    pendingLikeLoads.set(targetId, existing)

    if (pendingLikeLoadTimer) return
    pendingLikeLoadTimer = setTimeout(flushModuleLikeLoads, 12)
  })
}

async function flushModuleLikeLoads() {
  const batch = new Map(pendingLikeLoads)
  pendingLikeLoads.clear()
  pendingLikeLoadTimer = null

  const ids = Array.from(batch.keys())
  if (!ids.length) return

  try {
    const chunks = Array.from(
      { length: Math.ceil(ids.length / MAX_MODULE_LIKE_BATCH_IDS) },
      (_, index) => ids.slice(index * MAX_MODULE_LIKE_BATCH_IDS, (index + 1) * MAX_MODULE_LIKE_BATCH_IDS),
    )
    const payloads = await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(`/api/module-likes?ids=${encodeURIComponent(chunk.join(','))}`)
        if (!res.ok) throw new Error('Unable to load likes')
        return res.json() as Promise<Record<string, ModuleLikeData>>
      }),
    )
    const payload = Object.assign({}, ...payloads) as Record<string, ModuleLikeData>
    ids.forEach((id) => {
      const data = payload[id] || emptyLikeData
      batch.get(id)?.forEach(({ resolve }) => resolve(data))
    })
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error('Unable to load likes')
    batch.forEach((loads) => loads.forEach(({ reject }) => reject(error)))
  }
}

type Particle = {
  x: number
  y: number
  size: number
  rotate: number
  rotateEnd: number
  originY: number
  shape: 'dot' | 'shard'
  color: string
  duration: number
}

type LikeOptions = {
  isSuper?: boolean
}

type WindowWithWebAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

function HeartIcon({ className, size = HEART_ICON_SIZE }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 21.75c-.33 0-.65-.12-.9-.35C5.18 16.05 2 13.06 2 8.8 2 5.43 4.6 3 7.8 3c1.8 0 3.36.78 4.2 2 .84-1.22 2.4-2 4.2-2C19.4 3 22 5.43 22 8.8c0 4.26-3.18 7.25-9.1 12.6-.25.23-.57.35-.9.35Z"
      />
    </svg>
  )
}

function createParticles(intensity: number, burst = 1): Particle[] {
  const count = Math.round((5 + intensity * 5) * burst)
  const spread = (18 + intensity * 18) * (burst > 1 ? 1.45 : 1)

  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45
    const distance = spread * (0.75 + Math.random() * 0.35)
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 4 + Math.random() * 3 + (burst > 1 ? 2 : 0),
      rotate: Math.random() * 180 - 90,
      rotateEnd: Math.random() * 180 - 90,
      originY: 0,
      shape: 'dot',
      color: 'rgb(239 68 68)',
      duration: burst > 1 ? 0.42 : 0.2,
    }
  })
}

function createHeartFragments(intensity: number): Particle[] {
  const count = Math.round(18 + intensity * 8)
  const spread = 42 + intensity * 18
  const reds = ['#ef4444', '#f43f5e', '#fb7185', '#dc2626']

  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.35
    const distance = spread * (0.75 + Math.random() * 0.45)
    const rotate = Math.random() * 360

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 12,
      size: 5 + Math.random() * 8,
      rotate,
      rotateEnd: rotate + 180 + Math.random() * 160,
      originY: -18,
      shape: 'shard',
      color: reds[index % reds.length],
      duration: 0.46 + Math.random() * 0.16,
    }
  })
}

function AnimatedCount({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-[1em] min-w-[1ch] items-center overflow-hidden tabular-nums leading-none">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -5, opacity: 0 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function ModuleLikeButton({ targetId, initialCount = 0 }: { targetId: string; initialCount?: number }) {
  const initialLikeData = {
    ...emptyLikeData,
    count: initialCount,
  }
  const prefersReducedMotion = useReducedMotion()
  const [data, setData] = useState<ModuleLikeData>(initialLikeData)
  const [displayCount, setDisplayCount] = useState(initialLikeData.count)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [error, setError] = useState('')
  const [isLimitFeedback, setIsLimitFeedback] = useState(false)
  const [isChargingSuperLike, setIsChargingSuperLike] = useState(false)
  const [isSuperLikeChargeVisible, setIsSuperLikeChargeVisible] = useState(false)
  const [hasPoppedSuperLike, setHasPoppedSuperLike] = useState(false)
  const [superLikeBonusId, setSuperLikeBonusId] = useState(0)
  const [tapPulseCount, setTapPulseCount] = useState(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const limitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const superLikeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const superLikeChargeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const superLikeBonusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const popTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const pendingCountAnimation = useRef<{ from: number; to: number } | null>(null)
  const suppressNextClickRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const superLikeChargeVisibleRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chargeOscillatorRef = useRef<OscillatorNode | null>(null)
  const chargeGainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadLikes() {
      setIsLoading(true)
      try {
        const loadedData = await requestModuleLikeData(targetId)
        if (!isActive) return
        setData(loadedData)
        setDisplayCount(loadedData.count)
        setError('')
      } catch (caught) {
        if (!isActive) return
        setError('Unable to load')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadLikes()

    return () => {
      isActive = false
      if (particleTimeout.current) clearTimeout(particleTimeout.current)
      if (limitTimeout.current) clearTimeout(limitTimeout.current)
      if (superLikeTimeout.current) clearTimeout(superLikeTimeout.current)
      if (superLikeChargeTimeout.current) clearTimeout(superLikeChargeTimeout.current)
      if (superLikeBonusTimeout.current) clearTimeout(superLikeBonusTimeout.current)
      if (popTimeout.current) clearTimeout(popTimeout.current)
      if (suppressClickTimeout.current) clearTimeout(suppressClickTimeout.current)
      countTimeouts.current.forEach(clearTimeout)
      pendingCountAnimation.current = null
      superLikeChargeVisibleRef.current = false
      try {
        chargeOscillatorRef.current?.stop()
      } catch {
        // The oscillator may already have ended.
      }
    }
  }, [targetId])

  const updateSuperLikeChargeVisible = useCallback((isVisible: boolean) => {
    superLikeChargeVisibleRef.current = isVisible
    setIsSuperLikeChargeVisible(isVisible)
  }, [])

  const showLimitFeedback = useCallback(() => {
    setIsLimitFeedback(true)
    if (limitTimeout.current) clearTimeout(limitTimeout.current)
    limitTimeout.current = setTimeout(() => setIsLimitFeedback(false), 180)
  }, [])

  const clearCountTimeouts = useCallback(() => {
    countTimeouts.current.forEach(clearTimeout)
    countTimeouts.current = []
  }, [])

  const animateDisplayCount = useCallback((from: number, to: number) => {
    clearCountTimeouts()

    const distance = Math.abs(to - from)
    if (distance === 0) {
      setDisplayCount(to)
      return
    }

    if (distance > SUPER_MODULE_LIKE_AMOUNT) {
      setDisplayCount(to)
      return
    }

    const direction = Math.sign(to - from)
    setDisplayCount(from)

    countTimeouts.current = Array.from({ length: distance }, (_, index) =>
      setTimeout(() => {
        setDisplayCount(from + direction * (index + 1))
      }, SUPER_LIKE_COUNT_STEP_MS * (index + 1)),
    )
  }, [clearCountTimeouts])

  const flushPendingCountAnimation = useCallback(() => {
    const pending = pendingCountAnimation.current
    if (!pending) return

    pendingCountAnimation.current = null
    animateDisplayCount(pending.from, pending.to)
  }, [animateDisplayCount])

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null

    if (!audioContextRef.current) {
      const AudioContextConstructor =
        window.AudioContext || (window as WindowWithWebAudio).webkitAudioContext
      if (!AudioContextConstructor) return null
      audioContextRef.current = new AudioContextConstructor()
    }

    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }

    return audioContextRef.current
  }, [])

  const stopChargeSound = useCallback((fadeDuration = 0.06) => {
    const audioContext = audioContextRef.current
    const oscillator = chargeOscillatorRef.current
    const gain = chargeGainRef.current
    if (!audioContext || !oscillator || !gain) return

    const now = audioContext.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeDuration)

    try {
      oscillator.stop(now + fadeDuration + 0.02)
    } catch {
      // Already stopped by the browser's scheduler.
    }

    chargeOscillatorRef.current = null
    chargeGainRef.current = null
  }, [])

  const startChargeSound = useCallback((durationMs = SUPER_LIKE_HOLD_MS) => {
    const audioContext = getAudioContext()
    if (!audioContext) return

    stopChargeSound(0.01)

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const now = audioContext.currentTime
    const durationSeconds = Math.max(durationMs / 1000, 0.24)

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(190, now)
    oscillator.frequency.exponentialRampToValueAtTime(720, now + durationSeconds)
    oscillator.detune.setValueAtTime(-8, now)
    oscillator.detune.linearRampToValueAtTime(14, now + durationSeconds)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.026, now + 0.08)
    gain.gain.linearRampToValueAtTime(0.046, now + durationSeconds)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + durationSeconds + 0.08)

    chargeOscillatorRef.current = oscillator
    chargeGainRef.current = gain
  }, [getAudioContext, stopChargeSound])

  const playPopSound = useCallback(() => {
    const audioContext = getAudioContext()
    if (!audioContext) return

    const now = audioContext.currentTime
    const duration = 0.16
    const sampleCount = Math.floor(audioContext.sampleRate * duration)
    const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate)
    const channel = buffer.getChannelData(0)

    for (let index = 0; index < sampleCount; index += 1) {
      const progress = index / sampleCount
      channel[index] = (Math.random() * 2 - 1) * (1 - progress) ** 2
    }

    const noise = audioContext.createBufferSource()
    const noiseFilter = audioContext.createBiquadFilter()
    const noiseGain = audioContext.createGain()
    const thump = audioContext.createOscillator()
    const thumpGain = audioContext.createGain()

    noise.buffer = buffer
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.setValueAtTime(650, now)
    noiseGain.gain.setValueAtTime(0.13, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    thump.type = 'sine'
    thump.frequency.setValueAtTime(155, now)
    thump.frequency.exponentialRampToValueAtTime(54, now + 0.14)
    thumpGain.gain.setValueAtTime(0.09, now)
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(audioContext.destination)
    thump.connect(thumpGain)
    thumpGain.connect(audioContext.destination)

    noise.start(now)
    noise.stop(now + duration)
    thump.start(now)
    thump.stop(now + 0.16)
  }, [getAudioContext])

  const playCancelSound = useCallback(() => {
    const audioContext = getAudioContext()
    if (!audioContext) return
    if (audioContext.state === 'suspended') void audioContext.resume()

    const now = audioContext.currentTime
    const duration = 0.28
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(720, now)
    oscillator.frequency.exponentialRampToValueAtTime(190, now + duration)
    oscillator.detune.setValueAtTime(14, now)
    oscillator.detune.linearRampToValueAtTime(-8, now + duration)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.042, now + 0.018)
    gain.gain.linearRampToValueAtTime(0.025, now + duration * 0.45)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }, [getAudioContext])

  const suppressNextClick = useCallback(() => {
    suppressNextClickRef.current = true
    if (suppressClickTimeout.current) clearTimeout(suppressClickTimeout.current)
    suppressClickTimeout.current = setTimeout(() => {
      suppressNextClickRef.current = false
    }, CLICK_SUPPRESSION_MS)
  }, [])

  const submitLike = useCallback(async (amount = 1, options: LikeOptions = {}) => {
    if (isLoading || isSaving) return

    if (!data.canLike) {
      showLimitFeedback()
      return
    }

    const requestedAmount = Math.min(Math.max(Math.trunc(amount), 1), SUPER_MODULE_LIKE_AMOUNT)
    const acceptedAmount = Math.min(
      requestedAmount,
      MAX_MODULE_LIKES_PER_VISITOR - data.userLikes,
    )

    if (acceptedAmount <= 0) {
      showLimitFeedback()
      return
    }

    const previous = data
    const nextUserLikes = data.userLikes + acceptedAmount
    const optimistic: ModuleLikeData = {
      count: data.count + acceptedAmount,
      userLikes: nextUserLikes,
      hasLiked: true,
      canLike: nextUserLikes < MAX_MODULE_LIKES_PER_VISITOR,
    }

    setData(optimistic)
    if (options.isSuper && acceptedAmount > 1) {
      clearCountTimeouts()
      pendingCountAnimation.current = { from: previous.count, to: optimistic.count }
      setDisplayCount(previous.count)
    } else {
      clearCountTimeouts()
      pendingCountAnimation.current = null
      setDisplayCount(optimistic.count)
    }
    setIsSaving(true)
    setError('')

    if (!prefersReducedMotion) {
      const intensity = nextUserLikes / MAX_MODULE_LIKES_PER_VISITOR
      if (!options.isSuper) setTapPulseCount((count) => count + 1)
      setParticles(options.isSuper ? createHeartFragments(intensity) : createParticles(intensity))
      if (particleTimeout.current) clearTimeout(particleTimeout.current)
      particleTimeout.current = setTimeout(() => setParticles([]), options.isSuper ? 680 : 220)
    }

    try {
      const res = await fetch('/api/module-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, amount: acceptedAmount }),
      })
      if (!res.ok) throw new Error('Unable to save like')
      const saved: ModuleLikeData = await res.json()
      setData(saved)
      if (saved.count !== optimistic.count) {
        if (options.isSuper && acceptedAmount > 1) {
          pendingCountAnimation.current = { from: previous.count, to: saved.count }
        } else {
          animateDisplayCount(optimistic.count, saved.count)
        }
      } else if (!options.isSuper || acceptedAmount <= 1) {
        clearCountTimeouts()
        pendingCountAnimation.current = null
        setDisplayCount(saved.count)
      }
    } catch {
      clearCountTimeouts()
      pendingCountAnimation.current = null
      setData(previous)
      setDisplayCount(previous.count)
      setError('Unable to save')
    } finally {
      setIsSaving(false)
    }
  }, [
    animateDisplayCount,
    clearCountTimeouts,
    data,
    isLoading,
    isSaving,
    prefersReducedMotion,
    showLimitFeedback,
    targetId,
  ])

  const handleLike = useCallback(() => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false
      if (suppressClickTimeout.current) clearTimeout(suppressClickTimeout.current)
      return
    }

    void submitLike()
  }, [submitLike])

  const cancelSuperLikeHold = useCallback(() => {
    if (!superLikeTimeout.current) return
    const shouldCancelVisibleCharge =
      superLikeChargeVisibleRef.current || superLikeChargeTimeout.current === null

    clearTimeout(superLikeTimeout.current)
    superLikeTimeout.current = null
    if (superLikeChargeTimeout.current) clearTimeout(superLikeChargeTimeout.current)
    superLikeChargeTimeout.current = null

    if (shouldCancelVisibleCharge) {
      suppressNextClick()
      playCancelSound()
    }

    setIsChargingSuperLike(false)
    updateSuperLikeChargeVisible(false)
    stopChargeSound(shouldCancelVisibleCharge ? 0.025 : 0.06)
  }, [playCancelSound, stopChargeSound, suppressNextClick, updateSuperLikeChargeVisible])

  const startSuperLikeHold = useCallback(() => {
    if (isLoading || isSaving || !data.canLike || superLikeTimeout.current) return

    setIsChargingSuperLike(true)
    updateSuperLikeChargeVisible(false)
    setHasPoppedSuperLike(false)

    superLikeChargeTimeout.current = setTimeout(() => {
      superLikeChargeTimeout.current = null
      updateSuperLikeChargeVisible(true)
      startChargeSound(SUPER_LIKE_HOLD_MS - SUPER_LIKE_CHARGE_DELAY_MS)
    }, SUPER_LIKE_CHARGE_DELAY_MS)

    superLikeTimeout.current = setTimeout(() => {
      superLikeTimeout.current = null
      if (superLikeChargeTimeout.current) clearTimeout(superLikeChargeTimeout.current)
      superLikeChargeTimeout.current = null
      setIsChargingSuperLike(false)
      updateSuperLikeChargeVisible(false)
      suppressNextClick()
      stopChargeSound(0.02)
      playPopSound()

      if (!prefersReducedMotion) {
        setHasPoppedSuperLike(true)
        if (popTimeout.current) clearTimeout(popTimeout.current)
        popTimeout.current = setTimeout(() => setHasPoppedSuperLike(false), SUPER_LIKE_POP_MS)
      }

      setSuperLikeBonusId((id) => id + 1)
      if (superLikeBonusTimeout.current) clearTimeout(superLikeBonusTimeout.current)
      superLikeBonusTimeout.current = setTimeout(() => {
        setSuperLikeBonusId(0)
      }, SUPER_LIKE_BONUS_MS)

      void submitLike(SUPER_MODULE_LIKE_AMOUNT, { isSuper: true })
    }, SUPER_LIKE_HOLD_MS)
  }, [
    data.canLike,
    isLoading,
    isSaving,
    playPopSound,
    prefersReducedMotion,
    startChargeSound,
    stopChargeSound,
    submitLike,
    suppressNextClick,
    updateSuperLikeChargeVisible,
  ])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointerIdRef.current = event.pointerId
      setIsPressing(true)

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        pointerIdRef.current = null
      }

      startSuperLikeHold()
    },
    [startSuperLikeHold],
  )

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      setIsPressing(false)

      if (pointerIdRef.current === event.pointerId) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId)
        } catch {
          // Pointer capture can already be released by the browser.
        }
        pointerIdRef.current = null
      }

      cancelSuperLikeHold()
      flushPendingCountAnimation()
    },
    [cancelSuperLikeHold, flushPendingCountAnimation],
  )

  const fillProgress = Math.min(data.userLikes / MAX_MODULE_LIKES_PER_VISITOR, 1)
  const isHeartActive = data.hasLiked || isChargingSuperLike || hasPoppedSuperLike
  const isSuperHeartVisible = (isSuperLikeChargeVisible || hasPoppedSuperLike) && !prefersReducedMotion
  const hasShardParticles = particles.some((particle) => particle.shape === 'shard')
  const heartColor = isHeartActive
    ? `hsl(0, ${72 + fillProgress * 18}%, ${54 - fillProgress * 10}%)`
    : undefined
  const smallHeartAnimation = tapPulseCount > 0 && !prefersReducedMotion && !isSuperHeartVisible
    ? { rotate: 0, scale: [1, 1.16, 1] }
    : { rotate: 0, scale: 1 }
  const smallHeartTransition: Transition = { duration: 0.18, ease: 'easeOut' }
  const superHeartPositionAnimation = hasPoppedSuperLike
    ? {
        opacity: [1, 1, 0],
        rotate: [0, 8, -10],
        x: 0,
      }
    : isSuperLikeChargeVisible
      ? {
          opacity: 1,
          x: SUPER_HEART_SHAKE_X,
          rotate: SUPER_HEART_SHAKE_ROTATE,
        }
      : { opacity: 1, x: 0, rotate: 0 }
  const superHeartSizeAnimation = hasPoppedSuperLike
    ? {
        width: [SUPER_HEART_SIZE, SUPER_HEART_SIZE * 1.12, 4],
        height: [SUPER_HEART_SIZE, SUPER_HEART_SIZE * 1.12, 4],
      }
    : isSuperLikeChargeVisible
      ? {
          width: [18, 24, 32, 42, 53, SUPER_HEART_SIZE],
          height: [18, 24, 32, 42, 53, SUPER_HEART_SIZE],
        }
      : { width: HEART_ICON_SIZE, height: HEART_ICON_SIZE }
  const superHeartPositionTransition: Transition = hasPoppedSuperLike
    ? { duration: SUPER_LIKE_POP_MS / 1000, ease: 'easeOut' }
    : isSuperLikeChargeVisible
      ? {
          duration: SUPER_LIKE_CHARGE_DURATION_SECONDS,
          ease: 'linear',
          times: SUPER_HEART_SHAKE_TIMES,
        }
      : { duration: 0.18, ease: 'easeOut' }
  const superHeartSizeTransition: Transition = hasPoppedSuperLike
    ? { duration: SUPER_LIKE_POP_MS / 1000, ease: 'easeOut' }
    : isSuperLikeChargeVisible
      ? {
          duration: SUPER_LIKE_CHARGE_DURATION_SECONDS,
          ease: 'easeInOut',
        }
      : { duration: 0.18, ease: 'easeOut' }

  return (
    <div className="relative pointer-events-auto">
      <motion.button
        type="button"
        onClick={handleLike}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(event) => {
          if (isChargingSuperLike || hasPoppedSuperLike) event.preventDefault()
        }}
        disabled={isLoading}
        aria-label={`Like this module. Hold for a super like worth ${SUPER_MODULE_LIKE_AMOUNT} likes. ${data.count} total likes. You have liked it ${data.userLikes} times.`}
        className={cn(
          'inline-flex h-8 touch-manipulation select-none items-center gap-1.5 rounded-full bg-elevated px-2.5 text-caption font-medium text-muted shadow-sm outline outline-1 outline-offset-0 outline-gray-400/40 transition-colors duration-150',
          'hover:text-content focus-visible:ring-2 focus-visible:ring-content/30 disabled:cursor-default disabled:opacity-70',
          isHeartActive && 'text-red-500 hover:text-red-600',
        )}
        style={heartColor ? { color: heartColor } : undefined}
        animate={{
          ...(isLimitFeedback && !prefersReducedMotion ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }),
          scale: isPressing && !isLoading ? 0.965 : 1,
        }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        <span className="relative inline-flex size-[18px] items-center justify-center overflow-visible">
          {isSuperHeartVisible && (
            <span className="pointer-events-none absolute bottom-0 left-1/2 z-20 inline-flex -translate-x-1/2 overflow-visible">
              <motion.span
                className="inline-flex items-center justify-center"
                initial={{
                  opacity: 1,
                  rotate: 0,
                  x: 0,
                }}
                animate={superHeartPositionAnimation}
                transition={superHeartPositionTransition}
                style={{ transformOrigin: '50% 100%' }}
              >
                <motion.span
                  className="inline-flex items-center justify-center"
                  initial={{
                    width: HEART_ICON_SIZE,
                    height: HEART_ICON_SIZE,
                  }}
                  animate={superHeartSizeAnimation}
                  transition={superHeartSizeTransition}
                  style={{ transformOrigin: '50% 100%' }}
                >
                  <HeartIcon className="size-full" size={SUPER_HEART_SIZE} />
                </motion.span>
              </motion.span>
            </span>
          )}

          <motion.span
            key={tapPulseCount}
            className={cn(
              'relative z-10 inline-flex will-change-transform',
              isSuperHeartVisible && 'opacity-0',
            )}
            animate={smallHeartAnimation}
            transition={smallHeartTransition}
          >
            <HeartIcon className={cn('size-[18px]', isHeartActive ? 'opacity-100' : 'opacity-45')} />
          </motion.span>

          <AnimatePresence>
            {superLikeBonusId > 0 && (
              <span
                key={`super-like-bonus-position-${superLikeBonusId}`}
                className="pointer-events-none absolute bottom-0 left-1/2 z-30 inline-flex -translate-x-1/2 overflow-visible"
              >
                <motion.span
                  key={`super-like-bonus-${superLikeBonusId}`}
                  className="inline-flex select-none items-center justify-center rounded-full px-1 font-heading text-[19px] font-semibold leading-none text-red-500"
                  style={{ textShadow: 'none', WebkitTextStroke: '0' }}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0, scale: 1 }
                      : { opacity: 0, x: -3, y: -10, scale: 0.68, rotate: -8 }
                  }
                  animate={
                    prefersReducedMotion
                      ? { opacity: [0, 1, 0] }
                      : {
                          opacity: [0, 1, 1, 0],
                          x: [-3, 3, 15, 25],
                          y: [-10, -34, -56, -74],
                          scale: [0.68, 1.18, 1, 0.92],
                          rotate: [-8, 3, -2, 1],
                        }
                  }
                  exit={{ opacity: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.3, ease: 'easeOut' }
                      : {
                          duration: SUPER_LIKE_BONUS_MS / 1000,
                          ease: 'easeOut',
                          times: [0, 0.18, 0.62, 1],
                        }
                  }
                >
                  +{SUPER_MODULE_LIKE_AMOUNT}
                </motion.span>
              </span>
            )}

            {particles.length > 0 && (
              <motion.span
                key={data.userLikes}
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: hasShardParticles ? 0.68 : 0.22, ease: 'easeOut' }}
              >
                {particles.map((particle, index) => (
                  <motion.span
                    key={`${particle.x}-${particle.y}-${index}`}
                    className={cn(
                      'absolute left-1/2 top-1/2',
                      particle.shape === 'dot' ? 'rounded-full' : 'rounded-[1px]',
                    )}
                    style={{
                      width: particle.size,
                      height: particle.shape === 'shard' ? particle.size * 1.35 : particle.size,
                      backgroundColor: particle.color,
                      clipPath: particle.shape === 'shard'
                        ? 'polygon(50% 0%, 100% 100%, 0% 78%)'
                        : undefined,
                    }}
                    initial={{
                      x: '-50%',
                      y: `calc(-50% + ${particle.originY}px)`,
                      scale: 1,
                      opacity: 1,
                      rotate: particle.rotate,
                    }}
                    animate={{
                      x: `calc(-50% + ${particle.x}px)`,
                      y: `calc(-50% + ${particle.originY + particle.y}px)`,
                      scale: 0,
                      opacity: 0,
                      rotate: particle.rotateEnd,
                    }}
                    transition={{ duration: particle.duration, ease: 'easeOut' }}
                  />
                ))}
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <AnimatedCount value={displayCount} />
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.span
            key={error}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-full bg-content px-2 py-1 text-[11px] leading-none text-inverse shadow-sm"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

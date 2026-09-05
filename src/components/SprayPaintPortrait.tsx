'use client'

import Image from 'next/image'
import { SwatchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import * as Popover from '@radix-ui/react-popover'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

type PortraitImage = {
  url: string
  alt?: string | null
}

type Point = {
  x: number
  y: number
}

type SprayGrowth = {
  anchor: Point
  amount: number
}

type PaintColor = {
  r: number
  g: number
  b: number
}

type Drip = {
  x: number
  y: number
  velocity: number
  width: number
  opacity: number
  duration: number
  remaining: number
  phase: number
  color: PaintColor
}

const DEFAULT_COLOR = '#001feb'
const DEFAULT_BRUSH_SIZE = 44
const MAX_PIXEL_RATIO = 2
const QUICK_PAINT_COLORS = [
  { name: 'Blue', value: '#001feb' },
  { name: 'Red', value: '#ff3b30' },
  { name: 'Yellow', value: '#ffd60a' },
  { name: 'Green', value: '#34c759' },
] as const

function hexToRgb(hex: string): PaintColor {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgba(color: PaintColor, opacity: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`
}

export function SprayPaintPortrait({
  image,
  imageDark,
  eager = false,
}: {
  image: PortraitImage
  imageDark?: PortraitImage | null
  eager?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef(DEFAULT_COLOR)
  const brushSizeRef = useRef(DEFAULT_BRUSH_SIZE)
  const pointerRef = useRef<Point | null>(null)
  const sprayGrowthRef = useRef<SprayGrowth | null>(null)
  const strokeWetnessRef = useRef(0)
  const activePointerRef = useRef<number | null>(null)
  const isPaintingRef = useRef(false)
  const dripsRef = useRef<Drip[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const previousFrameTimeRef = useRef<number | null>(null)
  const lastHoldSprayRef = useRef(0)
  const lastDripTimeRef = useRef(0)
  const isVisibleRef = useRef(true)
  const reducedMotionRef = useRef(false)
  const colorPressAnimationsRef = useRef(new WeakMap<HTMLElement, Animation>())
  const startAnimationRef = useRef<() => void>(() => undefined)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE)
  const [hasPainted, setHasPainted] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false)
  const [brushSizePopoverColor, setBrushSizePopoverColor] = useState<string | null>(null)
  const controlsId = useId()

  colorRef.current = color
  brushSizeRef.current = brushSize

  const getContext = useCallback(() => {
    return canvasRef.current?.getContext('2d') || null
  }, [])

  const drawSpray = useCallback((point: Point, pressure = 1, growth = 0) => {
    const context = getContext()
    if (!context) return

    const colorValue = hexToRgb(colorRef.current)
    const baseRadius = brushSizeRef.current / 2
    const radius = baseRadius * (1 + growth * 0.75)
    const mist = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
    mist.addColorStop(0, rgba(colorValue, (0.15 + growth * 0.09) * pressure))
    mist.addColorStop(0.5, rgba(colorValue, (0.07 + growth * 0.045) * pressure))
    mist.addColorStop(1, rgba(colorValue, 0))

    context.fillStyle = mist
    context.beginPath()
    context.arc(point.x, point.y, radius, 0, Math.PI * 2)
    context.fill()

    if (growth > 0.12) {
      const wetRadius = baseRadius * (0.28 + growth * 0.42)
      const wetCenter = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, wetRadius)
      wetCenter.addColorStop(0, rgba(colorValue, 0.1 * growth * pressure))
      wetCenter.addColorStop(0.72, rgba(colorValue, 0.045 * growth * pressure))
      wetCenter.addColorStop(1, rgba(colorValue, 0))
      context.fillStyle = wetCenter
      context.beginPath()
      context.arc(point.x, point.y, wetRadius, 0, Math.PI * 2)
      context.fill()
    }

    const particleCount = Math.round(radius * 3 * pressure)
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const isOverspray = Math.random() > 0.84
      const distance = isOverspray
        ? radius * (0.76 + Math.random() * 0.46)
        : radius * Math.pow(Math.random(), 1.55)
      const particleRadius = isOverspray
        ? 0.2 + Math.random() * 0.7
        : 0.25 + Math.random() * (Math.random() > 0.9 ? 1.9 : 1.05)
      const particleOpacity = (isOverspray
        ? 0.1 + Math.random() * 0.28
        : 0.2 + Math.random() * 0.52) * pressure
      const x = point.x + Math.cos(angle) * distance
      const y = point.y + Math.sin(angle) * distance

      context.fillStyle = rgba(colorValue, particleOpacity)
      context.beginPath()
      context.arc(x, y, particleRadius, 0, Math.PI * 2)
      context.fill()
    }
  }, [getContext])

  const drawStaticDrip = useCallback((point: Point, colorValue: PaintColor) => {
    const context = getContext()
    const canvas = canvasRef.current
    if (!context || !canvas) return

    const radius = brushSizeRef.current / 2
    const startX = point.x + (Math.random() - 0.5) * radius * 1.1
    const startY = point.y + radius * (0.18 + Math.random() * 0.4)
    const length = Math.min(
      28 + Math.random() * radius * 2.2,
      canvas.getBoundingClientRect().height - startY - 3,
    )
    if (length < 5) return

    const width = 1.1 + Math.random() * Math.max(1.8, radius * 0.12)
    const endX = startX + (Math.random() - 0.5) * 4
    const endY = startY + length

    context.strokeStyle = rgba(colorValue, 0.72)
    context.lineWidth = width
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(startX, startY)
    context.bezierCurveTo(startX, startY + length * 0.35, endX, startY + length * 0.72, endX, endY)
    context.stroke()

    context.fillStyle = rgba(colorValue, 0.82)
    context.beginPath()
    context.arc(endX, endY, width * 0.85, 0, Math.PI * 2)
    context.fill()
  }, [getContext])

  const addDrip = useCallback((point: Point) => {
    const canvas = canvasRef.current
    const context = getContext()
    if (!canvas || !context) return

    const bounds = canvas.getBoundingClientRect()
    const radius = brushSizeRef.current / 2
    const colorValue = hexToRgb(colorRef.current)
    const x = Math.max(3, Math.min(bounds.width - 3, point.x + (Math.random() - 0.5) * radius * 1.25))
    const y = Math.min(bounds.height - 4, point.y + radius * (0.18 + Math.random() * 0.42))
    if (y >= bounds.height - 6) return

    if (reducedMotionRef.current) {
      drawStaticDrip({ x, y }, colorValue)
      return
    }

    const width = 2.4 + Math.random() * Math.max(2.8, radius * 0.18)
    context.fillStyle = rgba(colorValue, 0.7)
    context.beginPath()
    context.ellipse(x, y, width * 1.4, width, 0, 0, Math.PI * 2)
    context.fill()

    const duration = 700 + Math.random() * 1400
    dripsRef.current.push({
      x,
      y,
      velocity: 0.025 + Math.random() * 0.035,
      width,
      opacity: 0.48 + Math.random() * 0.28,
      duration,
      remaining: duration,
      phase: Math.random() * Math.PI * 2,
      color: colorValue,
    })
  }, [drawStaticDrip, getContext])

  const paintBetween = useCallback((from: Point, to: Point) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    const spacing = Math.max(3, brushSizeRef.current * 0.13)
    const steps = Math.max(1, Math.ceil(distance / spacing))

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps
      drawSpray({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      })
    }

    strokeWetnessRef.current += steps

    const now = performance.now()
    if (
      strokeWetnessRef.current > 18
      && distance > brushSizeRef.current * 0.45
      && now - lastDripTimeRef.current > 750
      && Math.random() > 0.82
    ) {
      addDrip(to)
      lastDripTimeRef.current = now
    }
  }, [addDrip, drawSpray])

  const updateDrips = useCallback((time: number) => {
    const context = getContext()
    const canvas = canvasRef.current
    if (!context || !canvas) return

    const bounds = canvas.getBoundingClientRect()
    const previousTime = previousFrameTimeRef.current ?? time
    const delta = Math.min(34, Math.max(8, time - previousTime))
    previousFrameTimeRef.current = time
    const nextDrips: Drip[] = []

    for (const drip of dripsRef.current) {
      const previousX = drip.x
      const previousY = drip.y
      drip.phase += delta * 0.0022
      drip.x += Math.sin(drip.phase) * 0.018 * delta
      drip.velocity = Math.min(0.19, drip.velocity + delta * 0.00007)
      drip.y += drip.velocity * delta
      drip.remaining -= delta

      context.strokeStyle = rgba(drip.color, drip.opacity)
      context.lineWidth = Math.max(0.9, drip.width * (0.58 + 0.42 * (drip.remaining / drip.duration)))
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(previousX, previousY)
      context.lineTo(drip.x, drip.y)
      context.stroke()

      if (Math.random() > 0.9) {
        context.fillStyle = rgba(drip.color, drip.opacity * 0.75)
        context.beginPath()
        context.arc(drip.x, drip.y, drip.width * (0.55 + Math.random() * 0.32), 0, Math.PI * 2)
        context.fill()
      }

      if (drip.remaining > 0 && drip.y < bounds.height - 3) {
        nextDrips.push(drip)
      } else {
        context.fillStyle = rgba(drip.color, Math.min(0.9, drip.opacity + 0.12))
        context.beginPath()
        context.arc(drip.x, Math.min(drip.y, bounds.height - 3), drip.width * 0.86, 0, Math.PI * 2)
        context.fill()
      }
    }

    dripsRef.current = nextDrips
  }, [getContext])

  const startAnimation = useCallback(() => {
    if (animationFrameRef.current !== null || !isVisibleRef.current || reducedMotionRef.current) return

    const tick = (time: number) => {
      animationFrameRef.current = null
      if (!isVisibleRef.current) return

      if (isPaintingRef.current && pointerRef.current && time - lastHoldSprayRef.current > 72) {
        const elapsed = time - lastHoldSprayRef.current
        const growth = sprayGrowthRef.current
        if (!growth || Math.hypot(
          pointerRef.current.x - growth.anchor.x,
          pointerRef.current.y - growth.anchor.y,
        ) > brushSizeRef.current * 0.3) {
          sprayGrowthRef.current = { anchor: pointerRef.current, amount: 0 }
        } else {
          growth.amount = Math.min(1, growth.amount + elapsed / 1200)
        }

        const growthAmount = sprayGrowthRef.current?.amount || 0
        drawSpray(pointerRef.current, 0.82, growthAmount)
        strokeWetnessRef.current += 0.8 + growthAmount
        if (growthAmount > 0.58 && time - lastDripTimeRef.current > 900 && Math.random() > 0.78) {
          addDrip(pointerRef.current)
          lastDripTimeRef.current = time
        }
        lastHoldSprayRef.current = time
      }

      if (dripsRef.current.length > 0) updateDrips(time)

      if (isPaintingRef.current || dripsRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(tick)
      } else {
        previousFrameTimeRef.current = null
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)
  }, [addDrip, drawSpray, updateDrips])

  startAnimationRef.current = startAnimation

  useEffect(() => {
    const canvas = canvasRef.current
    const surface = surfaceRef.current
    if (!canvas || !surface) return

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      const nextWidth = Math.round(bounds.width * pixelRatio)
      const nextHeight = Math.round(bounds.height * pixelRatio)
      if (canvas.width === nextWidth && canvas.height === nextHeight) return

      const previousCanvas = document.createElement('canvas')
      previousCanvas.width = canvas.width
      previousCanvas.height = canvas.height
      previousCanvas.getContext('2d')?.drawImage(canvas, 0, 0)

      canvas.width = nextWidth
      canvas.height = nextHeight
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

      if (previousCanvas.width && previousCanvas.height) {
        context.drawImage(
          previousCanvas,
          0,
          0,
          previousCanvas.width,
          previousCanvas.height,
          0,
          0,
          bounds.width,
          bounds.height,
        )
      }
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery = window.matchMedia('(max-width: 1279px)')
    const updateMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches
    }
    const updateMobilePreference = () => {
      setIsMobile(mobileQuery.matches)
    }
    updateMotionPreference()
    updateMobilePreference()
    motionQuery.addEventListener('change', updateMotionPreference)
    mobileQuery.addEventListener('change', updateMobilePreference)

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(surface)
    resizeCanvas()

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting
      if (entry.isIntersecting && (isPaintingRef.current || dripsRef.current.length > 0)) {
        startAnimationRef.current()
      }
    })
    visibilityObserver.observe(surface)

    return () => {
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      motionQuery.removeEventListener('change', updateMotionPreference)
      mobileQuery.removeEventListener('change', updateMobilePreference)
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const getPointerPosition = (clientX: number, clientY: number): Point => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return { x: clientX - bounds.left, y: clientY - bounds.top }
  }

  const positionCursor = (point: Point, visible = true) => {
    const cursor = cursorRef.current
    if (!cursor) return
    cursor.style.opacity = visible ? '1' : '0'
    cursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`
  }

  const finishStroke = (point: Point | null) => {
    const buildup = sprayGrowthRef.current?.amount || 0
    const shouldDrip = buildup > 0.68
      ? Math.random() > 0.28
      : strokeWetnessRef.current > 24 && Math.random() > 0.75
    if (point && shouldDrip) addDrip(point)
    isPaintingRef.current = false
    setIsDrawing(false)
    activePointerRef.current = null
    pointerRef.current = point
    sprayGrowthRef.current = null
    strokeWetnessRef.current = 0
    startAnimation()
  }

  const clearPaint = () => {
    const canvas = canvasRef.current
    const context = getContext()
    if (!canvas || !context) return

    context.save()
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.restore()
    dripsRef.current = []
    setHasPainted(false)
  }

  const sprayFromKeyboard = () => {
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const point = { x: bounds.width / 2, y: bounds.height / 2 }
    setBrushSizePopoverColor(null)
    drawSpray(point)
    addDrip(point)
    setHasPainted(true)
    startAnimation()
  }

  const pressColorControl = (element: HTMLElement) => {
    if (reducedMotionRef.current) return

    colorPressAnimationsRef.current.get(element)?.cancel()
    const animation = element.animate([
      { transform: 'scale(1)', offset: 0 },
      { transform: 'scale(0.94)', offset: 1 },
    ], {
      duration: 90,
      easing: 'ease-out',
      fill: 'forwards',
    })
    colorPressAnimationsRef.current.set(element, animation)
  }

  const bounceColorControl = (element: HTMLElement) => {
    if (reducedMotionRef.current) return

    colorPressAnimationsRef.current.get(element)?.cancel()
    colorPressAnimationsRef.current.delete(element)
    element.animate([
      { transform: 'scale(0.94)', offset: 0 },
      { transform: 'scale(1.035)', offset: 0.48 },
      { transform: 'scale(0.995)', offset: 0.76 },
      { transform: 'scale(1)', offset: 1 },
    ], {
      duration: 260,
      easing: 'ease-out',
    })
  }

  return (
    <div
      ref={surfaceRef}
      className="group/portrait relative aspect-square overflow-hidden rounded-xl tablet:aspect-[3/4] tablet:rounded-2xl after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-xl after:border after:border-border tablet:after:rounded-2xl"
    >
      <Image
        src={image.url}
        alt={image.alt || 'Portrait of Gabriel Valdivia'}
        fill
        className={cn('object-cover', imageDark?.url && 'light-only')}
        sizes="(max-width: 1280px) 100vw, 33vw"
        quality={90}
        loading={eager ? 'eager' : undefined}
      />
      {imageDark?.url && (
        <Image
          src={imageDark.url}
          alt={imageDark.alt || image.alt || 'Portrait of Gabriel Valdivia'}
          fill
          className="dark-only object-cover"
          sizes="(max-width: 1280px) 100vw, 33vw"
          quality={90}
          loading={eager ? 'eager' : undefined}
        />
      )}

      <canvas
        ref={canvasRef}
        role="button"
        tabIndex={0}
        aria-label="Spray paint the portrait. Press Enter or Space to spray in the center."
        className="absolute inset-0 z-10 size-full touch-none cursor-none outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
        onPointerEnter={(event) => positionCursor(getPointerPosition(event.clientX, event.clientY))}
        onPointerLeave={() => {
          if (!isPaintingRef.current) positionCursor(pointerRef.current || { x: 0, y: 0 }, false)
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.preventDefault()
          const point = getPointerPosition(event.clientX, event.clientY)
          event.currentTarget.setPointerCapture(event.pointerId)
          activePointerRef.current = event.pointerId
          isPaintingRef.current = true
          setIsDrawing(true)
          setMobileControlsOpen(false)
          setBrushSizePopoverColor(null)
          pointerRef.current = point
          sprayGrowthRef.current = { anchor: point, amount: 0 }
          strokeWetnessRef.current = 1
          lastHoldSprayRef.current = performance.now()
          drawSpray(point)
          positionCursor(point)
          setHasPainted(true)
          startAnimation()
        }}
        onPointerMove={(event) => {
          const point = getPointerPosition(event.clientX, event.clientY)
          positionCursor(point)
          if (!isPaintingRef.current || activePointerRef.current !== event.pointerId) {
            pointerRef.current = point
            return
          }

          if (pointerRef.current) paintBetween(pointerRef.current, point)
          if (sprayGrowthRef.current && Math.hypot(
            point.x - sprayGrowthRef.current.anchor.x,
            point.y - sprayGrowthRef.current.anchor.y,
          ) > brushSizeRef.current * 0.3) {
            sprayGrowthRef.current = { anchor: point, amount: 0 }
          }
          pointerRef.current = point
          setHasPainted(true)
        }}
        onPointerUp={(event) => {
          if (activePointerRef.current !== event.pointerId) return
          const point = getPointerPosition(event.clientX, event.clientY)
          finishStroke(point)
        }}
        onPointerCancel={() => finishStroke(pointerRef.current)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          sprayFromKeyboard()
        }}
      />

      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-20 rounded-full border border-white/90 opacity-0 shadow-sm"
        style={{
          width: brushSize,
          height: brushSize,
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.28)',
        }}
      />

      <button
        type="button"
        aria-controls={controlsId}
        aria-expanded={mobileControlsOpen}
        aria-label="Open spray paint controls"
        title="Vandalize"
        onClick={() => setMobileControlsOpen(true)}
        className={cn(
          'absolute bottom-4 left-1/2 z-30 flex size-8 -translate-x-1/2 items-center justify-center rounded-full bg-black/45 text-white/70 shadow-sm backdrop-blur-sm transition-[opacity,transform,background-color] duration-150 ease-out hover:bg-black/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white desktop:hidden',
          mobileControlsOpen || isDrawing
            ? 'pointer-events-none translate-y-2 opacity-0'
            : 'translate-y-0 opacity-100',
        )}
      >
        <HugeiconsIcon aria-hidden="true" icon={SwatchIcon} size={16} strokeWidth={1.5} />
      </button>

      <div
        id={controlsId}
        aria-hidden={isDrawing || (isMobile && !mobileControlsOpen)}
        inert={isDrawing || (isMobile && !mobileControlsOpen)}
        className={cn(
          'absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/75 p-1.5 text-white shadow-sm transition-[opacity,transform] duration-150 ease-out',
          mobileControlsOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0',
          'desktop:pointer-events-auto',
          brushSizePopoverColor
            ? 'desktop:translate-y-0 desktop:opacity-100'
            : 'desktop:translate-y-2 desktop:opacity-0 desktop:group-hover/portrait:translate-y-0 desktop:group-hover/portrait:opacity-100 desktop:group-focus-within/portrait:translate-y-0 desktop:group-focus-within/portrait:opacity-100',
        )}
        style={{
          opacity: isDrawing ? 0 : undefined,
          pointerEvents: isDrawing ? 'none' : undefined,
          transform: isDrawing ? 'translateY(12px)' : undefined,
        }}
      >
        <div className="flex items-center gap-1" role="group" aria-label="Paint colors">
          {QUICK_PAINT_COLORS.map((paintColor) => (
            <Popover.Root
              key={paintColor.value}
              open={brushSizePopoverColor === paintColor.value}
              onOpenChange={(open) => setBrushSizePopoverColor(open ? paintColor.value : null)}
            >
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={`${paintColor.name} paint and brush size`}
                  aria-pressed={color === paintColor.value}
                  onPointerDown={(event) => pressColorControl(event.currentTarget)}
                  onPointerCancel={(event) => bounceColorControl(event.currentTarget)}
                  onClick={(event) => {
                    setColor(paintColor.value)
                    bounceColorControl(event.currentTarget)
                  }}
                >
                  <span
                    className="size-5 rounded-full"
                    style={{
                      backgroundColor: paintColor.value,
                      outline: color === paintColor.value ? '1px solid white' : undefined,
                      outlineOffset: color === paintColor.value ? '1px' : undefined,
                    }}
                  />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  side="top"
                  align="center"
                  sideOffset={8}
                  collisionPadding={8}
                  onOpenAutoFocus={(event) => event.preventDefault()}
                  className="z-50 flex h-10 items-center rounded-full border border-white/20 bg-black/75 px-3 text-white shadow-sm"
                >
                  <label className="flex items-center" title="Brush size">
                    <input
                      type="range"
                      min="12"
                      max="80"
                      step="2"
                      value={brushSize}
                      onChange={(event) => setBrushSize(Number(event.target.value))}
                      className="w-20 cursor-pointer appearance-none border-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:border-0 [&::-webkit-slider-runnable-track]:bg-white/30 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-white [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0 [&::-moz-range-track]:bg-white/30 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                      aria-label={`${paintColor.name} brush size`}
                      aria-valuetext={`${brushSize} pixels`}
                    />
                  </label>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          ))}
          <label
            className="relative flex size-7 cursor-pointer items-center justify-center rounded-full focus-within:ring-2 focus-within:ring-white"
            title="Custom paint color"
          >
            <span
              aria-hidden="true"
              className="relative size-5 overflow-hidden rounded-full"
              style={{
                outline: !QUICK_PAINT_COLORS.some((paintColor) => paintColor.value === color) ? '1px solid white' : undefined,
                outlineOffset: !QUICK_PAINT_COLORS.some((paintColor) => paintColor.value === color) ? '1px' : undefined,
              }}
            >
              <span
                className="absolute -inset-0.5"
                style={{ background: 'conic-gradient(#ff3b30, #ffd60a, #34c759, #00c7ff, #001feb, #bf5af2, #ff3b30)' }}
              />
            </span>
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              onPointerDown={(event) => pressColorControl(event.currentTarget.parentElement as HTMLElement)}
              onPointerCancel={(event) => bounceColorControl(event.currentTarget.parentElement as HTMLElement)}
              onClick={(event) => bounceColorControl(event.currentTarget.parentElement as HTMLElement)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Custom paint color"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={clearPaint}
          disabled={!hasPainted}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors duration-150 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default disabled:opacity-35"
          aria-label="Clear spray paint"
          title="Clear paint"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5" />
            <path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" />
            <path d="M9.5 16.5L9.5 10.5" />
            <path d="M14.5 16.5L14.5 10.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}

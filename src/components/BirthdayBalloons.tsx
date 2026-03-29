'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Balloon {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  rotation: number
  rotationSpeed: number
  popped: boolean
}

interface Confetti {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
  grounded: boolean
  groundedAt: number
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#FF9F43', '#6C5CE7', '#FDA7DF', '#55E6C1',
]

const BALLOON_COUNT = 12
const GRAVITY = 0.04
const BOUNCE_DAMPING = 0.6
const AIR_DRAG = 0.98
const BALLOON_RADIUS = 120
const CONFETTI_PER_POP = 60
const CONFETTI_FADE_DELAY = 2000
const CONFETTI_FADE_DURATION = 1500

export function BirthdayBalloons({ force = false }: { force?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const balloonsRef = useRef<Balloon[]>([])
  const balloonElsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const confettiRef = useRef<Confetti[]>([])
  const animFrameRef = useRef<number>(0)
  const dragRef = useRef<{ id: number; offsetX: number; offsetY: number; lastX: number; lastY: number; lastTime: number } | null>(null)
  const [balloonStates, setBalloonStates] = useState<Balloon[]>([])
  const [done, setDone] = useState(false)
  const tiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Only show on March 23rd
  const today = new Date()
  const isBirthday = today.getMonth() === 2 && today.getDate() === 23
  if (!isBirthday && !force) return null

  const initBalloons = useCallback(() => {
    const w = window.innerWidth
    const isMobile = w < 768
    const baseRadius = isMobile ? 60 : BALLOON_RADIUS
    const count = isMobile ? 8 : BALLOON_COUNT
    const balloons: Balloon[] = []
    for (let i = 0; i < count; i++) {
      const radius = baseRadius + (Math.random() - 0.5) * (isMobile ? 25 : 50)
      balloons.push({
        id: i,
        x: Math.random() * (w - radius * 2) + radius,
        y: -radius - Math.random() * 1200,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        radius,
        color: COLORS[i % COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        popped: false,
      })
    }
    balloonsRef.current = balloons
    setBalloonStates([...balloons])
  }, [])

  const spawnConfetti = useCallback((x: number, y: number, color: string, radius: number) => {
    const newConfetti: Confetti[] = []
    const count = Math.floor(CONFETTI_PER_POP * (radius / BALLOON_RADIUS))
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5)
      const speed = Math.random() * 7 + 3
      newConfetti.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: Math.random() > 0.5 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        grounded: false,
        groundedAt: 0,
      })
    }
    confettiRef.current = [...confettiRef.current, ...newConfetti]
  }, [])

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, balloonId: number) => {
    e.preventDefault()
    e.stopPropagation()
    const b = balloonsRef.current.find(b => b.id === balloonId)
    if (!b || b.popped) return

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    dragRef.current = {
      id: balloonId,
      offsetX: e.clientX - b.x,
      offsetY: e.clientY - b.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: Date.now(),
    }
    b.vx = 0
    b.vy = 0
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    e.preventDefault()

    const b = balloonsRef.current.find(b => b.id === drag.id)
    if (!b) return

    const now = Date.now()
    const dt = Math.max(1, now - drag.lastTime)

    b.x = e.clientX - drag.offsetX
    b.y = e.clientY - drag.offsetY

    // Track velocity for throwing
    b.vx = (e.clientX - drag.lastX) / dt * 16
    b.vy = (e.clientY - drag.lastY) / dt * 16

    drag.lastX = e.clientX
    drag.lastY = e.clientY
    drag.lastTime = now
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    e.preventDefault()
    const b = balloonsRef.current.find(b => b.id === dragRef.current!.id)
    if (b) {
      // Clamp throw velocity
      const maxV = 25
      b.vx = Math.max(-maxV, Math.min(maxV, b.vx))
      b.vy = Math.max(-maxV, Math.min(maxV, b.vy))
    }
    dragRef.current = null
  }, [])

  const handleBalloonClick = useCallback((e: React.MouseEvent, balloonId: number) => {
    // Only pop if it wasn't a drag
    const b = balloonsRef.current.find(b => b.id === balloonId)
    if (!b || b.popped) return
    // If velocity is low, treat as a click/pop
    if (Math.abs(b.vx) < 1 && Math.abs(b.vy) < 1) {
      b.popped = true
      spawnConfetti(b.x, b.y, b.color, b.radius)
    }
  }, [spawnConfetti])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    initBalloons()

    // Device orientation for mobile tilt
    const isMobile = window.innerWidth < 810
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // gamma = left/right tilt (-90 to 90), beta = front/back tilt (-180 to 180)
      const gamma = e.gamma || 0
      const beta = e.beta || 0
      // Normalize to a force multiplier (clamped)
      tiltRef.current = {
        x: Math.max(-1, Math.min(1, gamma / 30)),
        y: Math.max(-1, Math.min(1, (beta - 45) / 30)), // 45deg is neutral holding position
      }
    }

    if (isMobile) {
      const DOE = DeviceOrientationEvent as any
      // Only enable on devices that don't require permission (Android)
      if (typeof DOE.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', handleOrientation)
      }
    }

    let frameCount = 0
    const animate = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const balloons = balloonsRef.current
      const now = Date.now()
      const dragging = dragRef.current

      // Update balloons
      for (const b of balloons) {
        if (b.popped) continue
        if (dragging && dragging.id === b.id) continue

        b.vy += GRAVITY
        // Apply device tilt as additional force
        const tilt = tiltRef.current
        b.vx += tilt.x * 0.15
        b.vy += tilt.y * 0.1
        // Air resistance — stronger at higher speeds, like a light balloon
        b.vx *= AIR_DRAG
        b.vy *= AIR_DRAG
        // Gentle side-to-side wobble like a balloon drifting
        b.vx += Math.sin(now * 0.001 + b.id * 2.5) * 0.02
        b.x += b.vx
        b.y += b.vy
        b.rotation += b.rotationSpeed

        b.rotationSpeed *= 0.98
        if (Math.abs(b.rotationSpeed) > 0.04) {
          b.rotationSpeed = Math.sign(b.rotationSpeed) * 0.04
        }

        // Floor — on mobile, use donation pill top as floor if visible
        const donationEl = document.getElementById('birthday-donation')
        const floorY = (w < 810 && donationEl) ? donationEl.getBoundingClientRect().top : h
        if (b.y + b.radius > floorY) {
          b.y = floorY - b.radius
          b.vy = -Math.abs(b.vy) * BOUNCE_DAMPING
          if (Math.abs(b.vy) < 0.3) b.vy = 0
        }

        // Walls
        if (b.x - b.radius < 0) {
          b.x = b.radius
          b.vx = Math.abs(b.vx) * BOUNCE_DAMPING
        }
        if (b.x + b.radius > w) {
          b.x = w - b.radius
          b.vx = -Math.abs(b.vx) * BOUNCE_DAMPING
        }

        // Ceiling
        if (b.y - b.radius < 0) {
          b.y = b.radius
          b.vy = Math.abs(b.vy) * BOUNCE_DAMPING
        }
      }

      // Balloon-balloon collisions
      for (let i = 0; i < balloons.length; i++) {
        for (let j = i + 1; j < balloons.length; j++) {
          const a = balloons[i]
          const b = balloons[j]
          if (a.popped || b.popped) continue

          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = a.radius + b.radius

          if (dist < minDist && dist > 0) {
            const nx = dx / dist
            const ny = dy / dist
            const overlap = minDist - dist

            const aIsDragged = dragging && dragging.id === a.id
            const bIsDragged = dragging && dragging.id === b.id

            if (aIsDragged) {
              b.x += nx * overlap
              b.y += ny * overlap
            } else if (bIsDragged) {
              a.x -= nx * overlap
              a.y -= ny * overlap
            } else {
              a.x -= nx * overlap * 0.5
              a.y -= ny * overlap * 0.5
              b.x += nx * overlap * 0.5
              b.y += ny * overlap * 0.5
            }

            const dvx = a.vx - b.vx
            const dvy = a.vy - b.vy
            const dvDotN = dvx * nx + dvy * ny

            if (dvDotN > 0) {
              if (!aIsDragged) {
                a.vx -= dvDotN * nx * BOUNCE_DAMPING
                a.vy -= dvDotN * ny * BOUNCE_DAMPING
              }
              if (!bIsDragged) {
                b.vx += dvDotN * nx * BOUNCE_DAMPING
                b.vy += dvDotN * ny * BOUNCE_DAMPING
              }

              if (dvDotN > 2) {
                a.rotationSpeed += (Math.random() - 0.5) * 0.015
                b.rotationSpeed += (Math.random() - 0.5) * 0.015
              }
            }
          }
        }
      }

      // Update DOM balloon positions every frame
      for (const b of balloons) {
        const el = balloonElsRef.current.get(b.id)
        if (!el) continue
        if (b.popped) {
          el.style.display = 'none'
          continue
        }
        el.style.transform = `translate(${b.x - b.radius}px, ${b.y - b.radius}px) rotate(${b.rotation}rad)`
      }

      // Update and draw confetti on canvas
      const confetti = confettiRef.current
      for (const c of confetti) {
        if (!c.grounded) {
          c.vy += GRAVITY * 2.5
          c.vx *= 0.99
          c.x += c.vx
          c.y += c.vy
          c.rotation += c.rotationSpeed

          // Confetti-balloon collisions
          for (const b of balloons) {
            if (b.popped) continue
            const dx = c.x - b.x
            const dy = c.y - b.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < b.radius + c.size && dist > 0) {
              const nx = dx / dist
              const ny = dy / dist
              // Push confetti out
              c.x = b.x + nx * (b.radius + c.size)
              c.y = b.y + ny * (b.radius + c.size)
              // Reflect velocity off the balloon surface
              const dot = c.vx * nx + c.vy * ny
              c.vx -= 2 * dot * nx * 0.5
              c.vy -= 2 * dot * ny * 0.5
              c.rotationSpeed += (Math.random() - 0.5) * 5
            }
          }

          const confettiFloorEl = document.getElementById('birthday-donation')
          const confettiFloor = (w < 810 && confettiFloorEl) ? confettiFloorEl.getBoundingClientRect().top : h
          if (c.y + c.size > confettiFloor) {
            c.y = h - c.size
            c.grounded = true
            c.groundedAt = now
            c.vx = 0
            c.vy = 0
          }
        } else {
          const elapsed = now - c.groundedAt
          if (elapsed > CONFETTI_FADE_DELAY) {
            c.opacity = Math.max(0, 1 - (elapsed - CONFETTI_FADE_DELAY) / CONFETTI_FADE_DURATION)
          }
        }

        if (c.opacity <= 0) continue

        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate((c.rotation * Math.PI) / 180)
        ctx.globalAlpha = c.opacity
        ctx.fillStyle = c.color
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6)
        ctx.restore()
      }

      confettiRef.current = confetti.filter(c => c.opacity > 0)

      // Sync React state occasionally for popped state
      frameCount++
      if (frameCount % 10 === 0) {
        setBalloonStates([...balloons])
      }

      const allPopped = balloons.every(b => b.popped)
      const noConfetti = confettiRef.current.length === 0
      if (allPopped && noConfetti) {
        setDone(true)
        return
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [initBalloons])

  if (done) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50"
      style={{ pointerEvents: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Balloon DOM elements with glass effect */}
      {balloonsRef.current.map((b) => (
        <div
          key={b.id}
          ref={(el) => { if (el) balloonElsRef.current.set(b.id, el) }}
          onPointerDown={(e) => handlePointerDown(e, b.id)}
          onClick={(e) => handleBalloonClick(e, b.id)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: b.radius * 2,
            height: b.radius * 2,
            transform: `translate(${b.x - b.radius}px, ${b.y - b.radius}px) rotate(${b.rotation}rad)`,
            pointerEvents: b.popped ? 'none' : 'auto',
            display: b.popped ? 'none' : 'block',
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          {/* Outer shape clip */}
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50% 50% 50% 50% / 45% 45% 55% 55%',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Glass distortion layer */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backdropFilter: 'blur(18px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
                background: hexToRgba(b.color, 0.25),
              }}
            />
            {/* Inner glow / gradient */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 35% 30%, ${hexToRgba(lightenColor(b.color, 60), 0.35)} 0%, ${hexToRgba(b.color, 0.15)} 50%, ${hexToRgba(darkenColor(b.color, 30), 0.2)} 100%)`,
              }}
            />
            {/* Shine highlight */}
            <div
              style={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '30%',
                height: '35%',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)',
                transform: 'rotate(-20deg)',
              }}
            />
            {/* Border */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50% 50% 50% 50% / 45% 45% 55% 55%',
                border: `1.5px solid ${hexToRgba(b.color, 0.3)}`,
                boxShadow: `inset 0 0 30px ${hexToRgba(b.color, 0.1)}, 0 8px 32px ${hexToRgba(b.color, 0.15)}`,
              }}
            />
          </div>
          {/* Knot */}
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 10,
              height: 10,
              background: hexToRgba(darkenColor(b.color, 20), 0.5),
              clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
            }}
          />
        </div>
      ))}
      {/* Canvas for confetti */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

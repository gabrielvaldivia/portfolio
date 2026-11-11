'use client'

import { useEffect, useRef, useState } from 'react'

import { FitText } from '@/components/FitText'

import { parseRgb, sampleGlyphs, type EffectDef, type Env, type Instance, type Pointer } from './engine'

export type Bleed = { x: number; top: number; bottom: number }

// How far the canvas extends past the title box, so particles can fly out.
const DEFAULT_BLEED: Bleed = { x: 120, top: 170, bottom: 230 }

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

export function ParticleTitle({ effect, title, enabled, bleed = DEFAULT_BLEED }: {
  effect: EffectDef
  title: string
  enabled: boolean
  bleed?: Bleed
}) {
  const { x: BLEED_X, top: BLEED_TOP, bottom: BLEED_BOTTOM } = bleed
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas || !enabled) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pointer: Pointer = { x: 0, y: 0, inside: false, vx: 0, vy: 0 }
    let env: Env | null = null
    let instance: Instance | null = null
    let key = ''
    let dpr = 1
    let raf = 0
    let running = false
    let last = 0
    let lastMove = 0
    let hidden = false
    let span: HTMLElement | null = null

    const setHidden = (hide: boolean) => {
      if (!span || hidden === hide) return
      hidden = hide
      span.style.color = hide ? 'transparent' : ''
    }

    const setup = () => {
      span = wrap.querySelector('span')
      if (!span) return false
      const rect = wrap.getBoundingClientRect()
      const w = Math.round(rect.width + BLEED_X * 2)
      const h = Math.round(rect.height + BLEED_TOP + BLEED_BOTTOM)
      dpr = Math.min(2, window.devicePixelRatio || 1)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
      }
      const origin = { x: rect.left - BLEED_X, y: rect.top - BLEED_TOP }
      const range = document.createRange()
      range.selectNodeContents(span)
      const tr = range.getBoundingClientRect()
      const color = getComputedStyle(wrap).color
      const fontSize = parseFloat(getComputedStyle(span).fontSize) || 34
      const titleBox = { x: tr.left - origin.x, y: tr.top - origin.y, w: tr.width, h: tr.height }
      const rgb = parseRgb(color)
      const nextKey = `${w}x${h}:${fontSize}:${color}:${span.textContent}:${dpr}`
      env = {
        ctx, w, h, rgb, color, fontSize, pointer,
        dark: (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) / 255 > 0.5,
        title: titleBox,
        glyphs: env && key === nextKey ? env.glyphs : null,
        time: performance.now() / 1000,
      }
      if (key !== nextKey || !instance) {
        key = nextKey
        if (effect.glyphStep) {
          env.glyphs = sampleGlyphs({
            span, origin, w, h, dpr, color, title: titleBox,
            step: effect.glyphStep(fontSize),
            edges: !!effect.edges,
          })
        }
        instance = effect.create(env)
      }
      return true
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHidden(false)
    }

    const frame = (t: number) => {
      if (!env || !instance) return stop()
      const dt = Math.min(1 / 30, Math.max(0, (t - last) / 1000))
      last = t
      env.time = t / 1000
      if (t - lastMove > 60) {
        pointer.vx *= 0.8
        pointer.vy *= 0.8
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, env.w, env.h)
      const alive = instance.step(env, dt)
      ctx.globalAlpha = 1
      if (alive || pointer.inside) {
        if (effect.hidesText) setHidden(true)
        raf = requestAnimationFrame(frame)
      } else {
        stop()
      }
    }

    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const onEnter = (e: PointerEvent) => {
      if (!setup() || !env || !instance) return
      const p = local(e)
      pointer.x = p.x
      pointer.y = p.y
      pointer.vx = pointer.vy = 0
      pointer.inside = true
      lastMove = performance.now()
      instance.enter?.(env)
      start()
    }

    const onMove = (e: PointerEvent) => {
      if (!env || !instance || !pointer.inside) return
      const p = local(e)
      const now = performance.now()
      const mdt = Math.max(1, now - lastMove) / 1000
      const from = { x: pointer.x, y: pointer.y }
      pointer.vx = pointer.vx * 0.6 + ((p.x - from.x) / mdt) * 0.4
      pointer.vy = pointer.vy * 0.6 + ((p.y - from.y) / mdt) * 0.4
      pointer.x = p.x
      pointer.y = p.y
      lastMove = now
      instance.move?.(env, from, p)
      start()
    }

    const onLeave = () => {
      pointer.inside = false
      if (env && instance) instance.leave?.(env)
    }

    const ro = new ResizeObserver(() => {
      // Force a fresh layout read (and glyph sample) on the next hover.
      key = ''
    })
    ro.observe(wrap)
    wrap.addEventListener('pointerenter', onEnter)
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)
    return () => {
      ro.disconnect()
      wrap.removeEventListener('pointerenter', onEnter)
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      stop()
    }
  }, [effect, title, enabled, BLEED_X, BLEED_TOP, BLEED_BOTTOM])

  return (
    <div ref={wrapRef} className="relative" style={{ marginLeft: '-5px' }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: -BLEED_X, top: -BLEED_TOP, zIndex: effect.behind ? 0 : 2 }}
      />
      <div className="relative" style={{ zIndex: 1 }}>
        <FitText className="font-heading">{title}</FitText>
      </div>
    </div>
  )
}

// Round 2: subtle effects that reshape the letters themselves. Each one paints
// the title from its glyph layer and only redraws the cells near the cursor.

import { makeDust } from './effects'
import type { EffectDef, Env } from './engine'

type Out = { x: number; y: number; a: number; s: number }

type CellEffectOptions = {
  id: string
  name: string
  description: string
  step: (fontSize: number) => number
  /** 'image' moves the real glyph pixels, 'square' draws flat blocks, 'dot' draws halftone dots. */
  mode: 'image' | 'square' | 'dot'
  /** Spring stiffness and damping. Without them, cells ease toward their target at `ease` per second. */
  spring?: [number, number]
  ease?: number
  /** Write the cell's target offset, alpha and scale into `out`. Leave it untouched for "at rest". */
  target(env: Env, cx: number, cy: number, i: number, out: Out, seed: number): void
}

const falloff = (d: number, r: number) => {
  if (d >= r) return 0
  const f = 1 - d / r
  return f * f * (3 - 2 * f)
}

function cellEffect(o: CellEffectOptions): EffectDef {
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    glyphStep: o.step,
    hidesText: true,
    create(env) {
      const g = env.glyphs!
      const n = g.count
      const ox = new Float32Array(n)
      const oy = new Float32Array(n)
      const vx = new Float32Array(n)
      const vy = new Float32Array(n)
      const al = new Float32Array(n).fill(1)
      const sc = new Float32Array(n).fill(1)
      const awake = new Uint8Array(n)
      const seed = new Float32Array(n)
      for (let i = 0; i < n; i++) seed[i] = Math.random()
      const list = new Int32Array(n)
      const out: Out = { x: 0, y: 0, a: 1, s: 1 }
      const dpr = g.layer.width / env.w

      return {
        step(env, dt) {
          const { ctx, w, h } = env
          const S = g.step
          ctx.globalAlpha = 1
          ctx.drawImage(g.layer, 0, 0, w, h)
          const k = o.ease ? Math.min(1, dt * o.ease) : 0
          let count = 0
          for (let i = 0; i < n; i++) {
            const cx = g.hx[i] + S / 2
            const cy = g.hy[i] + S / 2
            out.x = 0
            out.y = 0
            out.a = 1
            out.s = 1
            if (env.pointer.inside) o.target(env, cx, cy, i, out, seed[i])
            const rest = out.x === 0 && out.y === 0 && out.a === 1 && out.s === 1
            if (rest && !awake[i]) continue
            if (o.spring) {
              const [ks, kd] = o.spring
              vx[i] += (ks * (out.x - ox[i]) - kd * vx[i]) * dt
              vy[i] += (ks * (out.y - oy[i]) - kd * vy[i]) * dt
              ox[i] += vx[i] * dt
              oy[i] += vy[i] * dt
              al[i] += (out.a - al[i]) * Math.min(1, dt * 14)
              sc[i] += (out.s - sc[i]) * Math.min(1, dt * 14)
            } else {
              ox[i] += (out.x - ox[i]) * k
              oy[i] += (out.y - oy[i]) * k
              al[i] += (out.a - al[i]) * k
              sc[i] += (out.s - sc[i]) * k
            }
            const moving = Math.abs(ox[i]) + Math.abs(oy[i]) + Math.abs(vx[i]) * 0.02 + Math.abs(vy[i]) * 0.02
            if (rest && moving < 0.03 && Math.abs(al[i] - 1) < 0.01 && Math.abs(sc[i] - 1) < 0.005) {
              awake[i] = 0
              ox[i] = oy[i] = vx[i] = vy[i] = 0
              al[i] = sc[i] = 1
              continue
            }
            awake[i] = 1
            list[count++] = i
          }
          if (!count) return false

          for (let j = 0; j < count; j++) {
            const i = list[j]
            ctx.clearRect(g.hx[i], g.hy[i], S, S)
          }
          ctx.fillStyle = env.color
          for (let j = 0; j < count; j++) {
            const i = list[j]
            const x = g.hx[i] + ox[i]
            const y = g.hy[i] + oy[i]
            if (o.mode === 'image') {
              const size = S * sc[i]
              const off = (S - size) / 2
              ctx.globalAlpha = Math.max(0, Math.min(1, al[i]))
              // A hair of overlap hides seams between neighbouring cells.
              ctx.drawImage(
                g.layer,
                g.hx[i] * dpr, g.hy[i] * dpr, S * dpr, S * dpr,
                x + off - 0.25, y + off - 0.25, size + 0.5, size + 0.5,
              )
            } else if (o.mode === 'square') {
              if (g.ha[i] < 0.3) continue
              const size = S * sc[i]
              ctx.globalAlpha = (g.ha[i] > 0.55 ? 1 : 0.55) * al[i]
              ctx.fillRect(x + (S - size) / 2, y + (S - size) / 2, size, size)
            } else {
              // Halftone: `al` carries how far the cell has turned into a dot (1 = text, 0 = smallest dot).
              const t = Math.max(0, Math.min(1, 1 - al[i]))
              const r = (S / 2) * Math.sqrt(g.ha[i]) * (1.45 - 0.75 * t)
              if (r < 0.3) continue
              ctx.globalAlpha = 1
              ctx.beginPath()
              ctx.arc(x + S / 2, y + S / 2, r, 0, Math.PI * 2)
              ctx.fill()
            }
          }
          return true
        },
      }
    },
  }
}

const subtleDust = makeDust({
  id: 'dust-soft',
  name: 'Dust, soft',
  description: 'A light dusting: only a few grains lift off near the cursor and settle back quickly.',
  radius: 0.26,
  energy: 0.35,
  hold: [0.2, 0.45],
  fade: 1.1,
  density: 0.45,
})

const subtlePixels = cellEffect({
  id: 'pixels-soft',
  name: 'Pixels, soft',
  description: 'The letters under the cursor quantise into small blocks that nudge apart.',
  step: (fs) => Math.max(3, Math.round(fs / 24)),
  mode: 'square',
  spring: [200, 16],
  target(env, cx, cy, _i, out) {
    const { pointer } = env
    const dx = cx - pointer.x
    const dy = cy - pointer.y
    const d = Math.hypot(dx, dy) || 1
    const f = falloff(d, env.fontSize * 0.5)
    if (!f) return
    const push = f * env.fontSize * 0.022
    out.x = (dx / d) * push
    out.y = (dy / d) * push
    out.s = 1 - 0.18 * f
  },
})

const lens = cellEffect({
  id: 'lens',
  name: 'Lens',
  description: 'A soft magnifier glides over the type, gently bulging the strokes.',
  step: (fs) => Math.max(2, Math.round(fs / 60)),
  mode: 'image',
  ease: 14,
  target(env, cx, cy, _i, out) {
    const { pointer } = env
    const R = env.fontSize * 0.55
    const dx = cx - pointer.x
    const dy = cy - pointer.y
    const d = Math.hypot(dx, dy) || 1
    if (d >= R) return
    const u = d / R
    const m = env.fontSize * 0.07 * Math.sin(Math.PI * u) * (1 - u)
    out.x = (dx / d) * m
    out.y = (dy / d) * m
    out.s = 1 + 0.22 * (1 - u) * (1 - u)
  },
})

const wave = cellEffect({
  id: 'wave',
  name: 'Wave',
  description: 'A slow ripple rolls outward through the letters around the cursor.',
  step: (fs) => Math.max(2, Math.round(fs / 60)),
  mode: 'image',
  ease: 18,
  target(env, cx, cy, _i, out) {
    const { pointer } = env
    // Offsets vary only across x, so neighbouring cells in a column never tear apart.
    const d = Math.abs(cx - pointer.x)
    const f = falloff(d, env.fontSize * 1.1)
    if (!f) return
    out.y = Math.sin(d * (5 / env.fontSize) * Math.PI - env.time * 7) * env.fontSize * 0.02 * f
  },
})

const haze = cellEffect({
  id: 'haze',
  name: 'Heat haze',
  description: 'The strokes near the cursor shimmer, as if seen through warm air.',
  step: (fs) => Math.max(2, Math.round(fs / 55)),
  mode: 'image',
  ease: 10,
  target(env, cx, cy, _i, out) {
    const { pointer, time } = env
    const f = falloff(Math.hypot(cx - pointer.x, cy - pointer.y), env.fontSize * 0.6)
    if (!f) return
    // Horizontal-only shimmer: rows slide past each other without opening gaps.
    out.x = Math.sin(cy * 0.12 + time * 9) * Math.sin(cy * 0.031 - time * 4) * env.fontSize * 0.024 * f
  },
})

export const smear = cellEffect({
  id: 'smear',
  name: 'Smear',
  description: 'Letters are dragged a little in the direction you move, then wobble back.',
  step: (fs) => Math.max(2, Math.round(fs / 55)),
  mode: 'image',
  spring: [110, 9],
  target(env, cx, cy, _i, out) {
    const { pointer } = env
    const f = falloff(Math.hypot(cx - pointer.x, cy - pointer.y), env.fontSize * 0.55)
    if (!f) return
    const max = env.fontSize * 0.09
    out.x = Math.max(-max, Math.min(max, pointer.vx * 0.025)) * f
    out.y = Math.max(-max, Math.min(max, pointer.vy * 0.025)) * f
  },
})

const halftone = cellEffect({
  id: 'halftone',
  name: 'Halftone',
  description: 'Under the cursor the ink breaks into a fine halftone dot screen.',
  step: (fs) => Math.max(3, Math.round(fs / 30)),
  mode: 'dot',
  ease: 12,
  target(env, cx, cy, _i, out) {
    const { pointer } = env
    const f = falloff(Math.hypot(cx - pointer.x, cy - pointer.y), env.fontSize * 0.55)
    if (!f) return
    out.a = 1 - f
  },
})

const dither = cellEffect({
  id: 'dither',
  name: 'Dither',
  description: 'The ink thins into a grainy dither near the cursor, without moving.',
  step: (fs) => Math.max(2, Math.round(fs / 70)),
  mode: 'image',
  ease: 12,
  target(env, cx, cy, _i, out, seed) {
    const { pointer } = env
    const f = falloff(Math.hypot(cx - pointer.x, cy - pointer.y), env.fontSize * 0.5)
    if (!f) return
    out.a = seed < f * 0.6 ? 0.08 : 1
  },
})

// Weight: stamp the glyph layer in a small ring (a dilation) and fade it in
// through a soft radial mask, so strokes thicken smoothly under the cursor.
const weight: EffectDef = {
  id: 'weight',
  name: 'Weight',
  description: 'Strokes thicken under the cursor, like a local bump in font weight.',
  glyphStep: () => 12,
  create(env) {
    const g = env.glyphs!
    const dpr = g.layer.width / env.w
    const off = document.createElement('canvas')
    const octx = off.getContext('2d')!
    let amt = 0
    let px = env.pointer.x
    let py = env.pointer.y
    return {
      step(env, dt) {
        const { ctx, pointer } = env
        amt += ((pointer.inside ? 1 : 0) - amt) * Math.min(1, dt * 8)
        if (amt < 0.01) return false
        px += (pointer.x - px) * Math.min(1, dt * 16)
        py += (pointer.y - py) * Math.min(1, dt * 16)
        const R = env.fontSize * 0.6
        const size = Math.ceil(R * 2 * dpr)
        if (off.width !== size) off.width = off.height = size
        // Nested levels: more dilation toward the centre, each with a tight soft edge,
        // so weight ramps up smoothly instead of leaving a grey halo.
        const LEVELS = 4
        for (let j = 1; j <= LEVELS; j++) {
          octx.setTransform(1, 0, 0, 1, 0, 0)
          octx.globalCompositeOperation = 'source-over'
          octx.clearRect(0, 0, size, size)
          octx.setTransform(dpr, 0, 0, dpr, -(px - R) * dpr, -(py - R) * dpr)
          const r = env.fontSize * 0.005 * amt
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + j * 0.4
            octx.drawImage(g.layer, Math.cos(a) * r * j, Math.sin(a) * r * j, env.w, env.h)
          }
          octx.setTransform(1, 0, 0, 1, 0, 0)
          octx.globalCompositeOperation = 'destination-in'
          const outer = (size / 2) * (1 - (j - 1) / (LEVELS + 0.5))
          const grad = octx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, outer)
          grad.addColorStop(0, 'rgba(0,0,0,1)')
          grad.addColorStop(0.7, 'rgba(0,0,0,1)')
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          octx.fillStyle = grad
          octx.fillRect(0, 0, size, size)
          ctx.globalAlpha = 1
          ctx.drawImage(off, px - R, py - R, R * 2, R * 2)
        }
        return true
      },
    }
  },
}

const sag = cellEffect({
  id: 'sag',
  name: 'Sag',
  description: 'The letters under the cursor dip slightly under its weight and bounce back.',
  step: (fs) => Math.max(2, Math.round(fs / 55)),
  mode: 'image',
  spring: [90, 8],
  target(env, cx, cy, _i, out) {
    const { pointer } = env
    const f = falloff(Math.abs(cx - pointer.x), env.fontSize * 0.7)
    if (!f) return
    out.y = env.fontSize * 0.045 * f
  },
})

export const LETTER_EFFECTS: EffectDef[] = [
  subtleDust, subtlePixels, lens, wave, haze, smear, halftone, dither, weight, sag,
]

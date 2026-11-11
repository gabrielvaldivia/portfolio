import { drawGlow, glowSprite, rand, type EffectDef, type Env, type Vec } from './engine'

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

// 01 — Sparks ---------------------------------------------------------------

const sparks: EffectDef = {
  id: 'sparks',
  name: 'Sparks',
  description: 'Short bright streaks burst from the cursor as it moves.',
  create() {
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number }
    const ps: P[] = []
    const burst = (x: number, y: number, n: number, bvx = 0, bvy = 0) => {
      for (let i = 0; i < n && ps.length < 260; i++) {
        const a = Math.random() * Math.PI * 2
        const s = rand(120, 420)
        const max = rand(0.3, 0.65)
        ps.push({ x, y, vx: Math.cos(a) * s + bvx * 0.25, vy: Math.sin(a) * s + bvy * 0.25 - 60, life: max, max })
      }
    }
    return {
      enter(env) { burst(env.pointer.x, env.pointer.y, 22) },
      move(env, from, to) {
        const d = dist(from.x, from.y, to.x, to.y)
        burst(to.x, to.y, Math.min(7, Math.ceil(d / 7)), env.pointer.vx, env.pointer.vy)
      },
      step(env, dt) {
        const { ctx } = env
        ctx.lineCap = 'round'
        ctx.strokeStyle = env.color
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i]
          p.life -= dt
          if (p.life <= 0) { ps.splice(i, 1); continue }
          p.vx *= 1 - 2.2 * dt
          p.vy = p.vy * (1 - 2.2 * dt) + 700 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          const t = p.life / p.max
          ctx.globalAlpha = t
          ctx.lineWidth = 0.8 + 1.4 * t
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035)
          ctx.stroke()
        }
        return ps.length > 0
      },
    }
  },
}

// 02 — Dust -----------------------------------------------------------------

export type DustOptions = {
  id: string
  name: string
  description: string
  /** Release radius as a fraction of the font size. */
  radius: number
  /** Velocity multiplier for the outward push, wind and turbulence. */
  energy: number
  /** Seconds a grain drifts before it heads home: [min, max]. */
  hold: [number, number]
  /** How quickly drifting grains fade (per second). */
  fade: number
  /** 0..1: share of cells inside the radius that crumble. */
  density: number
}

export function makeDust(o: DustOptions): EffectDef {
  return {
  id: o.id,
  name: o.name,
  description: o.description,
  glyphStep: (fs) => Math.max(2, Math.round(fs / 55)),
  hidesText: true,
  create(env) {
    const g = env.glyphs!
    const n = g.count
    // Cells with a higher threshold only crumble when the cursor is closer.
    const reach = new Float32Array(n)
    for (let i = 0; i < n; i++) reach[i] = Math.random() < o.density ? rand(0.45, 1) : 0
    const dx = new Float32Array(n)
    const dy = new Float32Array(n)
    const vx = new Float32Array(n)
    const vy = new Float32Array(n)
    const age = new Float32Array(n)
    const hold = new Float32Array(n)
    const state = new Uint8Array(n) // 0 settled, 1 drifting, 2 returning
    return {
      step(env, dt) {
        const { ctx, pointer, w, h, time } = env
        const s = g.step
        ctx.globalAlpha = 1
        ctx.drawImage(g.layer, 0, 0, w, h)
        const R = env.fontSize * o.radius
        const R2 = R * R
        let active = false
        for (let i = 0; i < n; i++) {
          const cx = g.hx[i] + s / 2
          const cy = g.hy[i] + s / 2
          if (state[i] === 0) {
            if (!pointer.inside) continue
            const ox = cx - pointer.x
            const oy = cy - pointer.y
            const d2 = ox * ox + oy * oy
            if (d2 > R2 * reach[i] * reach[i]) continue
            const d = Math.sqrt(d2) || 1
            const push = rand(20, 70) * (1 - d / R) * o.energy
            state[i] = 1
            age[i] = 0
            hold[i] = rand(o.hold[0], o.hold[1])
            vx[i] = (ox / d) * push + rand(30, 110) * o.energy
            vy[i] = (oy / d) * push - rand(10, 60) * o.energy
          }
          active = true
          if (state[i] === 1) {
            age[i] += dt
            vx[i] += Math.sin(g.hy[i] * 0.07 + time * 2.3 + i) * 90 * o.energy * dt
            vy[i] += (Math.cos(g.hx[i] * 0.05 + time * 1.9) * 70 - 25) * o.energy * dt
            vx[i] *= 1 - 0.9 * dt
            vy[i] *= 1 - 0.9 * dt
            const far = !pointer.inside || dist(cx, cy, pointer.x, pointer.y) > R * 1.25
            if (age[i] > hold[i] && far) state[i] = 2
          } else {
            vx[i] += (-38 * dx[i] - 9.5 * vx[i]) * dt
            vy[i] += (-38 * dy[i] - 9.5 * vy[i]) * dt
            if (Math.abs(dx[i]) + Math.abs(dy[i]) < 0.35 && Math.abs(vx[i]) + Math.abs(vy[i]) < 6) {
              state[i] = 0
              dx[i] = dy[i] = vx[i] = vy[i] = 0
              continue
            }
          }
          dx[i] += vx[i] * dt
          dy[i] += vy[i] * dt
          ctx.clearRect(g.hx[i], g.hy[i], s, s)
        }
        if (!active) return false
        ctx.fillStyle = env.color
        for (let i = 0; i < n; i++) {
          if (state[i] === 0) continue
          const fade = state[i] === 1 ? Math.max(0.3, 1 - age[i] * o.fade) : 1
          ctx.globalAlpha = Math.min(1, g.ha[i] * 1.2) * fade
          const size = state[i] === 1 ? s * 0.8 : s
          ctx.fillRect(g.hx[i] + dx[i], g.hy[i] + dy[i], size, size)
        }
        return true
      },
    }
  },
  }
}

const dust = makeDust({
  id: 'dust',
  name: 'Dust',
  description: 'Letters near the cursor crumble into drifting dust, then re-form.',
  radius: 0.42,
  energy: 1,
  hold: [0.5, 1.1],
  fade: 0.55,
  density: 1,
})

// 03 — Glow trail -----------------------------------------------------------

const trail: EffectDef = {
  id: 'trail',
  name: 'Glow trail',
  description: 'A string of soft glowing dots is laid down behind the cursor.',
  create() {
    type D = { x: number; y: number; life: number }
    const dots: D[] = []
    let carry = 0
    const head = { x: 0, y: 0, a: 0 }
    return {
      enter(env) { head.x = env.pointer.x; head.y = env.pointer.y },
      move(_env, from, to) {
        const gap = 9
        const d = dist(from.x, from.y, to.x, to.y)
        let t = gap - carry
        while (t <= d) {
          const k = t / d
          dots.push({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, life: 1 })
          t += gap
        }
        carry = (carry + d) % gap
        if (dots.length > 160) dots.splice(0, dots.length - 160)
      },
      step(env, dt) {
        const { ctx, pointer } = env
        const sprite = glowSprite(env.rgb)
        if (env.dark) ctx.globalCompositeOperation = 'lighter'
        for (let i = dots.length - 1; i >= 0; i--) {
          const p = dots[i]
          p.life -= dt * 1.4
          if (p.life <= 0) { dots.splice(i, 1); continue }
          const e = p.life * p.life
          drawGlow(ctx, sprite, p.x, p.y, 5 + 20 * e, (env.dark ? 0.6 : 0.55) * e)
        }
        head.x += (pointer.x - head.x) * Math.min(1, dt * 18)
        head.y += (pointer.y - head.y) * Math.min(1, dt * 18)
        head.a += ((pointer.inside ? 1 : 0) - head.a) * Math.min(1, dt * 8)
        drawGlow(ctx, sprite, head.x, head.y, 36, head.a * (env.dark ? 0.6 : 0.45))
        ctx.globalCompositeOperation = 'source-over'
        return dots.length > 0 || head.a > 0.01
      },
    }
  },
}

// 04 — Confetti -------------------------------------------------------------

const CONFETTI = ['#F4B942', '#EF7B5C', '#6CB77E', '#5B9BE0', '#A886E0', '#E58FB2']

const confetti: EffectDef = {
  id: 'confetti',
  name: 'Confetti',
  description: 'A pop of paper confetti on hover, with a sprinkle as you move.',
  create() {
    type P = {
      x: number; y: number; vx: number; vy: number; rot: number; vr: number
      flip: number; vf: number; w: number; h: number; c: string; life: number
    }
    const ps: P[] = []
    let travel = 0
    const spawn = (x: number, y: number, n: number, spread: number, power: number) => {
      for (let i = 0; i < n && ps.length < 220; i++) {
        const a = -Math.PI / 2 + rand(-spread, spread)
        const s = rand(power * 0.45, power)
        ps.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          rot: rand(0, Math.PI * 2), vr: rand(-10, 10), flip: rand(0, Math.PI * 2), vf: rand(6, 14),
          w: rand(5, 9), h: rand(3, 5), c: CONFETTI[(Math.random() * CONFETTI.length) | 0], life: rand(1.8, 2.8),
        })
      }
    }
    return {
      enter(env) { spawn(env.pointer.x, env.pointer.y, 46, 0.9, 620) },
      move(_env, from, to) {
        travel += dist(from.x, from.y, to.x, to.y)
        while (travel > 22) { travel -= 22; spawn(to.x, to.y, 1, 1.2, 260) }
      },
      step(env, dt) {
        const { ctx } = env
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i]
          p.life -= dt
          if (p.life <= 0 || p.y > env.h + 20) { ps.splice(i, 1); continue }
          p.vx *= 1 - 2.6 * dt
          p.vy = p.vy * (1 - 2.6 * dt) + 520 * dt
          p.x += (p.vx + Math.sin(p.flip) * 22) * dt
          p.y += p.vy * dt
          p.rot += p.vr * dt
          p.flip += p.vf * dt
          ctx.globalAlpha = Math.min(1, p.life * 1.5)
          ctx.fillStyle = p.c
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.scale(1, Math.cos(p.flip))
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
        return ps.length > 0
      },
    }
  },
}

// 05 — Magnet ---------------------------------------------------------------

const magnet: EffectDef = {
  id: 'magnet',
  name: 'Magnet',
  description: 'A hidden field of filings wakes up and is drawn toward the cursor.',
  behind: true,
  create(env) {
    const gap = 15
    const { title } = env
    const xs: number[] = []
    const ys: number[] = []
    for (let y = title.y - 30; y <= title.y + title.h + 30; y += gap) {
      for (let x = title.x - 40; x <= title.x + title.w + 40; x += gap) {
        xs.push(x + rand(-2, 2))
        ys.push(y + rand(-2, 2))
      }
    }
    const n = xs.length
    const hx = new Float32Array(xs)
    const hy = new Float32Array(ys)
    const px = new Float32Array(hx)
    const py = new Float32Array(hy)
    const f = new Float32Array(n)
    let presence = 0
    return {
      step(env, dt) {
        const { ctx, pointer } = env
        const R = Math.max(180, env.fontSize * 1.6)
        presence += ((pointer.inside ? 1 : 0) - presence) * Math.min(1, dt * 5)
        ctx.strokeStyle = env.color
        ctx.lineCap = 'round'
        ctx.lineWidth = 1.2
        let active = presence > 0.01
        const k = Math.min(1, dt * 9)
        for (let i = 0; i < n; i++) {
          const ox = pointer.x - hx[i]
          const oy = pointer.y - hy[i]
          const d = Math.hypot(ox, oy) || 1
          let target = Math.max(0, 1 - d / R)
          target = target * target * presence
          f[i] += (target - f[i]) * k
          const pull = 0.42 * Math.pow(f[i], 1.3)
          const tx = hx[i] + ox * pull
          const ty = hy[i] + oy * pull
          px[i] += (tx - px[i]) * k
          py[i] += (ty - py[i]) * k
          if (f[i] < 0.004) continue
          active = true
          const len = 2 + 9 * f[i]
          const ux = ox / d
          const uy = oy / d
          ctx.globalAlpha = Math.min(0.85, f[i] * 1.6)
          ctx.beginPath()
          ctx.moveTo(px[i] - ux * len * 0.5, py[i] - uy * len * 0.5)
          ctx.lineTo(px[i] + ux * len * 0.5, py[i] + uy * len * 0.5)
          ctx.stroke()
        }
        return active
      },
    }
  },
}

// 06 — Pixels ---------------------------------------------------------------

const pixels: EffectDef = {
  id: 'pixels',
  name: 'Pixels',
  description: 'The type breaks into blocks that scatter from the cursor and snap back.',
  glyphStep: (fs) => Math.max(5, Math.round(fs / 15)),
  hidesText: true,
  create(env) {
    const g = env.glyphs!
    const n = g.count
    const ox = new Float32Array(n)
    const oy = new Float32Array(n)
    const vx = new Float32Array(n)
    const vy = new Float32Array(n)
    const lift = new Float32Array(n)
    const vl = new Float32Array(n)
    const ex = new Float32Array(n)
    return {
      step(env, dt) {
        const { ctx, pointer, w, h } = env
        const B = g.step
        ctx.globalAlpha = 1
        ctx.drawImage(g.layer, 0, 0, w, h)
        const R = env.fontSize * 0.75
        let active = false
        const sub = dt > 1 / 90 ? 2 : 1
        const sdt = dt / sub
        for (let i = 0; i < n; i++) {
          const cx = g.hx[i] + B / 2
          const cy = g.hy[i] + B / 2
          let tx = 0
          let ty = 0
          let tl = 0
          if (pointer.inside) {
            const dxp = cx - pointer.x
            const dyp = cy - pointer.y
            const d = Math.hypot(dxp, dyp) || 1
            if (d < R) {
              let f = 1 - d / R
              f = f * f * (3 - 2 * f)
              tx = (dxp / d) * f * B * 2.6
              ty = (dyp / d) * f * B * 2.6
              tl = f
            }
          }
          if (tl === 0 && ex[i] === 0) continue
          for (let s = 0; s < sub; s++) {
            vx[i] += (190 * (tx - ox[i]) - 13 * vx[i]) * sdt
            vy[i] += (190 * (ty - oy[i]) - 13 * vy[i]) * sdt
            vl[i] += (190 * (tl - lift[i]) - 13 * vl[i]) * sdt
            ox[i] += vx[i] * sdt
            oy[i] += vy[i] * sdt
            lift[i] += vl[i] * sdt
          }
          ex[i] = Math.abs(ox[i]) + Math.abs(oy[i]) + Math.abs(lift[i]) + Math.abs(vx[i]) * 0.01 + Math.abs(vy[i]) * 0.01
          if (tl === 0 && ex[i] < 0.04) {
            ex[i] = ox[i] = oy[i] = vx[i] = vy[i] = lift[i] = vl[i] = 0
            continue
          }
          active = true
          ctx.clearRect(g.hx[i], g.hy[i], B, B)
        }
        if (!active) return false
        ctx.fillStyle = env.color
        for (let i = 0; i < n; i++) {
          if (ex[i] === 0 || g.ha[i] < 0.3) continue
          const size = B * (0.84 + 0.3 * Math.max(0, lift[i]))
          ctx.globalAlpha = g.ha[i] > 0.55 ? 1 : 0.55
          ctx.fillRect(g.hx[i] + B / 2 + ox[i] - size / 2, g.hy[i] + B / 2 + oy[i] - size / 2, size, size)
        }
        return true
      },
    }
  },
}

// 07 — Fireflies ------------------------------------------------------------

const fireflies: EffectDef = {
  id: 'fireflies',
  name: 'Fireflies',
  description: 'Warm lights lift off the letters and wander upward, blinking.',
  glyphStep: (fs) => Math.max(4, Math.round(fs / 25)),
  create(env) {
    const g = env.glyphs!
    type F = { x: number; y: number; vx: number; vy: number; ph: number; w: number; life: number; max: number; seed: number }
    const fs: F[] = []
    let acc = 0
    const spawn = (pointer: Vec) => {
      if (!g.count) return
      let i = (Math.random() * g.count) | 0
      // Bias toward letters near the cursor.
      if (Math.random() < 0.65) {
        for (let tries = 0; tries < 12; tries++) {
          const j = (Math.random() * g.count) | 0
          if (Math.abs(g.hx[j] - pointer.x) < env.fontSize * 0.9) { i = j; break }
        }
      }
      const max = rand(2.2, 3.8)
      fs.push({
        x: g.hx[i] + g.step / 2, y: g.hy[i] + g.step / 2, vx: rand(-12, 12), vy: rand(-34, -12),
        ph: rand(0, Math.PI * 2), w: rand(2.5, 5), life: max, max, seed: rand(0, 100),
      })
    }
    return {
      enter(env) { for (let i = 0; i < 6; i++) spawn(env.pointer) },
      step(env, dt) {
        const { ctx, pointer, time } = env
        if (pointer.inside) {
          acc += dt * 14
          while (acc > 1) { acc--; if (fs.length < 46) spawn(pointer) }
        }
        const rgb: [number, number, number] = env.dark ? [255, 226, 120] : [214, 158, 20]
        const sprite = glowSprite(rgb, 0.12)
        if (env.dark) ctx.globalCompositeOperation = 'lighter'
        for (let i = fs.length - 1; i >= 0; i--) {
          const f = fs[i]
          f.life -= dt
          if (f.life <= 0) { fs.splice(i, 1); continue }
          f.vx += Math.sin(time * 1.3 + f.seed) * 24 * dt
          f.vy += Math.cos(time * 1.1 + f.seed * 1.7) * 14 * dt
          f.x += f.vx * dt
          f.y += f.vy * dt
          const t = f.life / f.max
          const fade = Math.min(1, (1 - t) * 6) * Math.min(1, t * 3)
          const blink = Math.pow(0.5 + 0.5 * Math.sin(time * f.w + f.ph), 2)
          const a = fade * (0.25 + 0.75 * blink)
          drawGlow(ctx, sprite, f.x, f.y, 22, a * (env.dark ? 0.9 : 0.75))
          ctx.globalAlpha = a
          ctx.fillStyle = env.dark ? '#fff8d8' : '#b07d06'
          ctx.fillRect(f.x - 1, f.y - 1, 2, 2)
        }
        ctx.globalCompositeOperation = 'source-over'
        return fs.length > 0
      },
    }
  },
}

// 08 — Ripples --------------------------------------------------------------

const ripples: EffectDef = {
  id: 'ripples',
  name: 'Ripples',
  description: 'Rings spread through a hidden dot grid behind the type.',
  behind: true,
  create(env) {
    const gap = 13
    const { title } = env
    const xs: number[] = []
    const ys: number[] = []
    for (let y = title.y - 40; y <= title.y + title.h + 40; y += gap) {
      for (let x = title.x - 60; x <= title.x + title.w + 60; x += gap) { xs.push(x); ys.push(y) }
    }
    const n = xs.length
    const hx = new Float32Array(xs)
    const hy = new Float32Array(ys)
    // Soften the grid toward its bounds so rings don't end in a hard rectangle.
    const edge = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const outX = Math.max(title.x - hx[i], hx[i] - (title.x + title.w), 0)
      const outY = Math.max(title.y - hy[i], hy[i] - (title.y + title.h), 0)
      edge[i] = Math.max(0, 1 - outX / 60) * Math.max(0, 1 - outY / 40)
    }
    type Ring = { x: number; y: number; age: number }
    const rings: Ring[] = []
    let travel = 0
    let since = 1
    const LIFE = 1.6
    const SPEED = 380
    return {
      enter(env) { rings.push({ x: env.pointer.x, y: env.pointer.y, age: 0 }); since = 0 },
      move(_env, from, to) {
        travel += dist(from.x, from.y, to.x, to.y)
        if (travel > 70 && since > 0.18) { rings.push({ x: to.x, y: to.y, age: 0 }); travel = 0; since = 0 }
      },
      step(env, dt) {
        const { ctx } = env
        since += dt
        for (let i = rings.length - 1; i >= 0; i--) {
          rings[i].age += dt
          if (rings[i].age > LIFE) rings.splice(i, 1)
        }
        if (rings.length > 7) rings.splice(0, rings.length - 7)
        if (!rings.length) return false
        ctx.fillStyle = env.color
        const width = 26
        for (let i = 0; i < n; i++) {
          let wave = 0
          let ox = 0
          let oy = 0
          for (const r of rings) {
            const ddx = hx[i] - r.x
            const ddy = hy[i] - r.y
            const d = Math.hypot(ddx, ddy) || 1
            const k = (d - r.age * SPEED) / width
            if (k < -3 || k > 3) continue
            const strength = 1 - r.age / LIFE
            const wv = Math.exp(-k * k) * strength * strength
            wave += wv
            ox += (ddx / d) * wv * 7
            oy += (ddy / d) * wv * 7
          }
          if (wave < 0.02) continue
          const a = Math.min(0.75, wave * 0.75) * edge[i]
          const s = 1 + Math.min(2.2, wave * 2)
          ctx.globalAlpha = a
          ctx.fillRect(hx[i] + ox - s / 2, hy[i] + oy - s / 2, s, s)
        }
        return true
      },
    }
  },
}

// 09 — Embers ---------------------------------------------------------------

const EMBER: [number, number, number][] = [
  [255, 244, 214],
  [255, 196, 92],
  [244, 120, 42],
  [196, 58, 30],
]

const EMBER_LIGHT: [number, number, number][] = [
  [255, 170, 40],
  [240, 120, 30],
  [210, 70, 25],
  [150, 50, 30],
]

const emberColor = (t: number, ramp = EMBER): [number, number, number] => {
  const x = (1 - t) * (ramp.length - 1)
  const i = Math.min(ramp.length - 2, Math.floor(x))
  const f = x - i
  const a = ramp[i]
  const b = ramp[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

const embers: EffectDef = {
  id: 'embers',
  name: 'Embers',
  description: 'Hot sparks rise and swirl from under the cursor, cooling as they climb.',
  create() {
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; seed: number }
    const ps: P[] = []
    let acc = 0
    const spriteSet = (ramp: [number, number, number][]) =>
      [0.95, 0.7, 0.45, 0.2].map((t) => glowSprite(emberColor(t, ramp).map(Math.round) as [number, number, number], 0.1))
    const darkSprites = spriteSet(EMBER)
    const lightSprites = spriteSet(EMBER_LIGHT)
    return {
      step(env, dt) {
        const { ctx, pointer, time } = env
        if (pointer.inside) {
          acc += dt * 55
          while (acc > 1 && ps.length < 240) {
            acc--
            const max = rand(0.8, 1.7)
            ps.push({
              x: pointer.x + rand(-14, 14), y: pointer.y + rand(-4, 8),
              vx: rand(-30, 30) + pointer.vx * 0.08, vy: rand(-170, -70),
              life: max, max, size: rand(0.8, 2), seed: rand(0, 100),
            })
          }
        }
        const ramp = env.dark ? EMBER : EMBER_LIGHT
        const sprites = env.dark ? darkSprites : lightSprites
        if (env.dark) ctx.globalCompositeOperation = 'lighter'
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i]
          p.life -= dt
          if (p.life <= 0) { ps.splice(i, 1); continue }
          p.vx += Math.sin(p.y * 0.035 + time * 3 + p.seed) * 160 * dt
          p.vx *= 1 - 1.5 * dt
          p.vy *= 1 - 0.6 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          const t = p.life / p.max
          const flicker = 0.75 + 0.25 * Math.sin(time * 30 + p.seed * 7)
          const sprite = sprites[Math.min(3, Math.floor((1 - t) * 4))]
          drawGlow(ctx, sprite, p.x, p.y, 10 + 10 * p.size * t, t * flicker * (env.dark ? 0.8 : 0.55))
          const [r, g, b] = emberColor(t, ramp)
          ctx.globalAlpha = Math.min(1, t * 1.4) * flicker
          ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        }
        ctx.globalCompositeOperation = 'source-over'
        return ps.length > 0
      },
    }
  },
}

// 10 — Outline --------------------------------------------------------------

const outline: EffectDef = {
  id: 'outline',
  name: 'Outline',
  description: 'Points of light race around the letter outlines near the cursor.',
  glyphStep: (fs) => Math.max(2, Math.round(fs / 60)),
  edges: true,
  create(env) {
    const g = env.glyphs!
    const chains = g.chains
    type C = { c: Float32Array; pos: number; speed: number; life: number; max: number; closed: boolean }
    const comets: C[] = []
    let since = 1
    const len = (c: Float32Array) => c.length / 2
    const nearestChains = (p: Vec, radius: number, limit: number) => {
      const found: { c: Float32Array; i: number; d: number }[] = []
      for (const c of chains) {
        let best = Infinity
        let bi = 0
        for (let i = 0; i < c.length; i += 6) {
          const d = (c[i] - p.x) ** 2 + (c[i + 1] - p.y) ** 2
          if (d < best) { best = d; bi = i / 2 }
        }
        if (best < radius * radius) found.push({ c, i: bi, d: best })
      }
      return found.sort((a, b) => a.d - b.d).slice(0, limit)
    }
    const launch = (p: Vec, radius: number, limit: number) => {
      for (const { c, i } of nearestChains(p, radius, limit)) {
        if (comets.length > 40) break
        const closed = Math.hypot(c[0] - c[c.length - 2], c[1] - c[c.length - 1]) < g.step * 3
        const max = rand(1.1, 1.9)
        for (const dir of [1, -1]) {
          comets.push({ c, pos: i, speed: dir * rand(0.7, 1.1) * Math.max(160, env.fontSize * 2.2) / g.step, life: max, max, closed })
        }
      }
    }
    return {
      enter(env) { launch(env.pointer, env.fontSize * 0.6, 4); since = 0 },
      move(env) {
        if (since > 0.12) { launch(env.pointer, env.fontSize * 0.35, 1); since = 0 }
      },
      step(env, dt) {
        const { ctx } = env
        since += dt
        const sprite = glowSprite(env.rgb, 0.15)
        ctx.fillStyle = env.color
        if (env.dark) ctx.globalCompositeOperation = 'lighter'
        for (let k = comets.length - 1; k >= 0; k--) {
          const m = comets[k]
          m.life -= dt
          const n = len(m.c)
          m.pos += m.speed * dt
          if (m.closed) m.pos = ((m.pos % n) + n) % n
          if (m.life <= 0 || (!m.closed && (m.pos < 0 || m.pos >= n))) { comets.splice(k, 1); continue }
          const t = m.life / m.max
          const fade = Math.min(1, t * 2.5) * Math.min(1, (1 - t) * 8)
          const tail = 26
          const dir = Math.sign(m.speed)
          for (let j = tail; j >= 0; j--) {
            let idx = Math.round(m.pos - dir * j)
            if (m.closed) idx = ((idx % n) + n) % n
            else if (idx < 0 || idx >= n) continue
            const a = (1 - j / tail) ** 1.6 * fade
            const s = 1.2 + 1.6 * (1 - j / tail)
            ctx.globalAlpha = a
            ctx.fillRect(m.c[idx * 2] - s / 2, m.c[idx * 2 + 1] - s / 2, s, s)
          }
          const hi = Math.round(m.pos) % n
          drawGlow(ctx, sprite, m.c[hi * 2], m.c[hi * 2 + 1], 18, fade * (env.dark ? 0.7 : 0.45))
        }
        ctx.globalCompositeOperation = 'source-over'
        return comets.length > 0
      },
    }
  },
}

export const EFFECTS: EffectDef[] = [
  sparks, dust, trail, confetti, magnet, pixels, fireflies, ripples, embers, outline,
]

export type { Env }

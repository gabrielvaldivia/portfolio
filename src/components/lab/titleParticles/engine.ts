// Shared plumbing for the work-title particle lab: environment, glyph sampling
// and cached glow sprites. Each effect draws into one canvas that overlays the
// title with some bleed so particles can leave the text box.

export type Vec = { x: number; y: number }

export type Glyphs = {
  step: number
  /** The title drawn into a canvas at device resolution, aligned with the stage canvas. */
  layer: HTMLCanvasElement
  count: number
  /** Top-left corner of each inked cell, in canvas CSS pixels. */
  hx: Float32Array
  hy: Float32Array
  /** Average ink coverage of each cell, 0..1. */
  ha: Float32Array
  /** Ordered outline paths as flat [x0, y0, x1, y1, ...] arrays. */
  chains: Float32Array[]
}

export type Pointer = Vec & { inside: boolean; vx: number; vy: number }

export type Env = {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  rgb: [number, number, number]
  color: string
  dark: boolean
  title: { x: number; y: number; w: number; h: number }
  fontSize: number
  pointer: Pointer
  glyphs: Glyphs | null
  time: number
}

export type Instance = {
  enter?(env: Env): void
  move?(env: Env, from: Vec, to: Vec): void
  leave?(env: Env): void
  /** Draw one frame. Return true while there is still something animating. */
  step(env: Env, dt: number): boolean
}

export type EffectDef = {
  id: string
  name: string
  description: string
  /** Draw the canvas under the title instead of over it. */
  behind?: boolean
  /** Glyph cell size for the given font size; omit if the effect doesn't need glyphs. */
  glyphStep?: (fontSize: number) => number
  edges?: boolean
  /** The effect paints the title itself, so the DOM text is hidden while it runs. */
  hidesText?: boolean
  create(env: Env): Instance
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a)

export function rgba([r, g, b]: [number, number, number], a: number) {
  return `rgba(${r},${g},${b},${a})`
}

const spriteCache = new Map<string, HTMLCanvasElement>()

/** A soft radial glow, drawn once per color and stretched with drawImage. */
export function glowSprite(rgb: [number, number, number], core = 0.18) {
  const key = `${rgb.join(',')}:${core}`
  const cached = spriteCache.get(key)
  if (cached) return cached
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, rgba(rgb, 1))
  grad.addColorStop(core, rgba(rgb, 0.85))
  grad.addColorStop(0.45, rgba(rgb, 0.22))
  grad.addColorStop(1, rgba(rgb, 0))
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  spriteCache.set(key, c)
  return c
}

export function drawGlow(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  if (alpha <= 0.002 || size <= 0) return
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
}

export function parseRgb(color: string): [number, number, number] {
  const m = color.match(/[\d.]+/g)
  if (!m || m.length < 3) return [0, 0, 0]
  return [Number(m[0]), Number(m[1]), Number(m[2])]
}

/** Draw each character where the browser laid it out, so canvas and DOM text line up. */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  span: HTMLElement,
  origin: Vec,
  font: string,
) {
  ctx.font = font
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText('Hg')
  const asc = m.fontBoundingBoxAscent
  const desc = m.fontBoundingBoxDescent
  const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent || ''
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]
      if (/\s/.test(ch)) continue
      range.setStart(node, i)
      range.setEnd(node, i + 1)
      const r = range.getClientRects()[0]
      if (!r) continue
      const baseline = r.top - origin.y + (r.height - (asc + desc)) / 2 + asc
      ctx.fillText(ch, r.left - origin.x, baseline)
    }
  }
}

export function sampleGlyphs(opts: {
  span: HTMLElement
  origin: Vec
  w: number
  h: number
  dpr: number
  step: number
  color: string
  edges: boolean
  title: Env['title']
}): Glyphs {
  const { span, origin, w, h, dpr, step, color, edges, title } = opts
  const style = getComputedStyle(span)
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

  const layer = document.createElement('canvas')
  layer.width = Math.round(w * dpr)
  layer.height = Math.round(h * dpr)
  const lctx = layer.getContext('2d')!
  lctx.scale(dpr, dpr)
  lctx.fillStyle = color
  drawTitle(lctx, span, origin, font)

  // Sample coverage on a 1x copy limited to the title box.
  const pad = step * 2
  const sx = Math.max(0, Math.floor(title.x - pad))
  const sy = Math.max(0, Math.floor(title.y - pad))
  const sw = Math.min(w - sx, Math.ceil(title.w + pad * 2))
  const sh = Math.min(h - sy, Math.ceil(title.h + pad * 2))
  const sample = document.createElement('canvas')
  sample.width = sw
  sample.height = sh
  const sctx = sample.getContext('2d', { willReadFrequently: true })!
  sctx.translate(-sx, -sy)
  sctx.fillStyle = '#000'
  drawTitle(sctx, span, origin, font)
  const data = sctx.getImageData(0, 0, sw, sh).data

  const cols = Math.ceil(sw / step)
  const rows = Math.ceil(sh / step)
  const grid = new Float32Array(cols * rows)
  const hx: number[] = []
  const hy: number[] = []
  const ha: number[] = []
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let sum = 0
      let n = 0
      const x0 = gx * step
      const y0 = gy * step
      for (let y = y0; y < Math.min(y0 + step, sh); y++) {
        for (let x = x0; x < Math.min(x0 + step, sw); x++) {
          sum += data[(y * sw + x) * 4 + 3]
          n++
        }
      }
      const a = n ? sum / n / 255 : 0
      grid[gy * cols + gx] = a
      if (a > 0.02) {
        hx.push(sx + x0)
        hy.push(sy + y0)
        ha.push(a)
      }
    }
  }

  const chains: Float32Array[] = []
  if (edges) {
    const filled = (gx: number, gy: number) =>
      gx >= 0 && gy >= 0 && gx < cols && gy < rows && grid[gy * cols + gx] > 0.3
    const isEdge = new Uint8Array(cols * rows)
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        // Outline cells sit just outside the ink so they read against the background.
        if (filled(gx, gy)) continue
        if (filled(gx - 1, gy) || filled(gx + 1, gy) || filled(gx, gy - 1) || filled(gx, gy + 1)) {
          isEdge[gy * cols + gx] = 1
        }
      }
    }
    // Greedy walk along neighbouring edge cells, preferring straight neighbours.
    const dirs = [
      [1, 0], [0, 1], [-1, 0], [0, -1],
      [1, 1], [-1, 1], [-1, -1], [1, -1],
      [2, 0], [0, 2], [-2, 0], [0, -2],
    ]
    for (let start = 0; start < isEdge.length; start++) {
      if (isEdge[start] !== 1) continue
      const pts: number[] = []
      let gx = start % cols
      let gy = (start / cols) | 0
      for (;;) {
        isEdge[gy * cols + gx] = 2
        pts.push(sx + gx * step + step / 2, sy + gy * step + step / 2)
        let moved = false
        for (const [ox, oy] of dirs) {
          const nx = gx + ox
          const ny = gy + oy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          if (isEdge[ny * cols + nx] === 1) {
            gx = nx
            gy = ny
            moved = true
            break
          }
        }
        if (!moved) break
      }
      if (pts.length >= 16) chains.push(new Float32Array(pts))
    }
  }

  return {
    step,
    layer,
    count: hx.length,
    hx: new Float32Array(hx),
    hy: new Float32Array(hy),
    ha: new Float32Array(ha),
    chains,
  }
}

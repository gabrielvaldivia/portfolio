/**
 * Shared between the admin's visual content editor and the canvas page it
 * frames. The canvas renders modules with the site's own components; the
 * admin owns the form state and applies every edit the canvas reports.
 */

export const BLOCK_EDITOR_SOURCE = 'block-editor'

/** The canvas always lays out at desktop width so modules sit on the 6-column grid. */
export const CANVAS_WIDTH = 1440
export const GRID_COLUMNS = 6
export const GRID_GAP = 40
export const ROW_HEIGHT = 200
export const MAX_ROWS = 6

/** Text modules grow with their copy, so only media modules take a fixed height. */
export const fixedHeightBlockTypes = ['image', 'video', 'browser', 'dc1', 'kale', 'iphone15', 'iphone13mini', 'iphone5', 'iphone6', 'iphonex']

export type CanvasBlock = Record<string, unknown> & { blockType: string; id?: string }

export type ParentMessage = {
  source: typeof BLOCK_EDITOR_SOURCE
  type: 'state'
  blocks: CanvasBlock[]
  selected: number | null
  /** The module starred as the share image, when one is picked instead of the automatic first image. */
  starred: number | null
  /** Whether this collection has a share image a module can be starred as. */
  canStar: boolean
  scale: number
  readOnly: boolean
}

export type CanvasMessage = { source: typeof BLOCK_EDITOR_SOURCE } & (
  | { type: 'ready' }
  | { type: 'height'; height: number }
  | { type: 'select'; index: number | null }
  | { type: 'move'; from: number; to: number }
  | { type: 'resize'; index: number; columns: string; rows: string }
  | { type: 'remove'; index: number }
  | { type: 'duplicate'; index: number }
  | { type: 'files'; index: number; files: File[] }
  | { type: 'star'; index: number }
)

export function isBlockEditorMessage(data: unknown): data is { source: typeof BLOCK_EDITOR_SOURCE; type: string } {
  return Boolean(data && typeof data === 'object' && (data as { source?: unknown }).source === BLOCK_EDITOR_SOURCE)
}

export type Rect = { left: number; top: number; right: number; bottom: number }

export type DropTarget = {
  /** Insertion index in the current block order. */
  index: number
  /** Where to draw the insertion bar, in canvas coordinates. */
  bar: { orientation: 'horizontal' | 'vertical'; x: number; y: number; length: number }
}

function distanceToRect(x: number, y: number, rect: Rect) {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0
  return Math.hypot(dx, dy)
}

/**
 * Picks the nearest module and drops before or after it: side by side for
 * partial-width modules, above or below for full-width ones.
 */
export function findDropTarget(
  x: number,
  y: number,
  cells: { rect: Rect; fullWidth: boolean }[],
  gridRect: Rect,
): DropTarget {
  if (!cells.length) {
    return { index: 0, bar: { orientation: 'horizontal', x: gridRect.left, y: gridRect.top, length: gridRect.right - gridRect.left } }
  }

  let nearest = 0
  let nearestDistance = Infinity
  cells.forEach(({ rect }, i) => {
    const distance = distanceToRect(x, y, rect)
    if (distance < nearestDistance) {
      nearest = i
      nearestDistance = distance
    }
  })

  const { rect, fullWidth } = cells[nearest]
  const half = GRID_GAP / 2
  if (fullWidth) {
    const before = y < (rect.top + rect.bottom) / 2
    return {
      index: before ? nearest : nearest + 1,
      bar: { orientation: 'horizontal', x: rect.left, y: before ? rect.top - half : rect.bottom + half, length: rect.right - rect.left },
    }
  }
  const before = x < (rect.left + rect.right) / 2
  return {
    index: before ? nearest : nearest + 1,
    bar: { orientation: 'vertical', x: before ? rect.left - half : rect.right + half, y: rect.top, length: rect.bottom - rect.top },
  }
}

/** Converts an insertion index into the destination index Payload's MOVE_ROW expects. */
export function moveDestination(from: number, insertionIndex: number) {
  return insertionIndex > from ? insertionIndex - 1 : insertionIndex
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function columnsForWidth(width: number, gridWidth: number, gap = GRID_GAP) {
  const columnWidth = (gridWidth - gap * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  return clamp(Math.round((width + gap) / (columnWidth + gap)), 1, GRID_COLUMNS)
}

export function rowsForHeight(height: number, gap = GRID_GAP) {
  return clamp(Math.round((height + gap) / (ROW_HEIGHT + gap)), 1, MAX_ROWS)
}

const uploadFieldNames = ['image', 'video'] as const

export type MediaDoc = { id: number | string; url?: string | null; mimeType?: string | null; [key: string]: unknown }

export function mediaId(value: unknown): string | null {
  if (typeof value === 'number' || (typeof value === 'string' && value)) return String(value)
  if (value && typeof value === 'object' && 'id' in value) return mediaId((value as { id: unknown }).id)
  return null
}

/** IDs of media the form holds only by reference, so the canvas can render them. */
export function unresolvedMediaIds(blocks: CanvasBlock[], known: Record<string, MediaDoc>) {
  const ids = new Set<string>()
  for (const block of blocks) {
    for (const name of uploadFieldNames) {
      const value = block[name]
      if (value && typeof value === 'object') continue
      const id = mediaId(value)
      if (id && !known[id]) ids.add(id)
    }
  }
  return [...ids]
}

export function withResolvedMedia(blocks: CanvasBlock[], known: Record<string, MediaDoc>): CanvasBlock[] {
  return blocks.map((block) => {
    const resolved: CanvasBlock = { ...block }
    for (const name of uploadFieldNames) {
      const value = block[name]
      if (value && typeof value === 'object') continue
      const id = mediaId(value)
      resolved[name] = id ? known[id] || null : null
    }
    return resolved
  })
}

export function blockForFile(file: File) {
  return file.type.startsWith('video/') ? { blockType: 'video', field: 'video' } : { blockType: 'image', field: 'image' }
}

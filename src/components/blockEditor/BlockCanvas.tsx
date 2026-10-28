'use client'

import { Component, useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Copy, GripVertical, Share2, Trash2 } from 'lucide-react'
import { blockComponents, staticModuleClassNames } from '@/blocks/RenderBlocks'
import { cn } from '@/lib/cn'
import {
  BLOCK_DRAG_TYPE,
  BLOCK_EDITOR_SOURCE,
  GRID_COLUMNS,
  columnsForWidth,
  findDropTarget,
  fixedHeightBlockTypes,
  isBlockEditorMessage,
  moveDestination,
  rowsForHeight,
  type CanvasBlock,
  type CanvasMessage,
  type DropTarget,
  type ParentMessage,
  type Rect,
} from '@/lib/blockEditor'

const ACCENT = '#0a84ff'
const DRAG_THRESHOLD = 6

const blockLabels: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  browser: 'Browser',
  text: 'Text',
  dc1: 'DC-1',
  kale: 'Kale',
  iphone15: 'iPhone 15',
  iphone13mini: 'iPhone 13 mini',
  iphone5: 'iPhone 5',
  iphone6: 'iPhone 6',
  iphonex: 'iPhone X',
}

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never

function send(message: DistributiveOmit<CanvasMessage, 'source'>) {
  if (window.parent === window) return
  window.parent.postMessage({ source: BLOCK_EDITOR_SOURCE, ...message }, window.location.origin)
}

class ModuleBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <Placeholder>{`${this.props.label} can’t be previewed`}</Placeholder> : this.props.children
  }
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-background-alt text-text-muted"
      style={{ minHeight: 200, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
    >
      {children}
    </div>
  )
}

function hasMedia(block: CanvasBlock) {
  if (block.blockType === 'text') return Boolean(block.content)
  const image = block.image as { url?: string } | null | undefined
  const video = block.video as { url?: string } | null | undefined
  return Boolean(image?.url || video?.url || block.url)
}

function emptyLabel(block: CanvasBlock) {
  if (block.blockType === 'text') return 'Empty text — edit it in the settings'
  return `${blockLabels[block.blockType] || 'Module'} — choose media in the settings`
}

function toRect(rect: DOMRect): Rect {
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
}

type Drag =
  | { kind: 'pending'; index: number; x: number; y: number; pointerId: number }
  | { kind: 'move'; index: number }
  | { kind: 'resize'; index: number; axis: 'x' | 'y' | 'xy'; columns: string; rows: string }

export function BlockCanvas() {
  const [state, setState] = useState<Omit<ParentMessage, 'source' | 'type'> | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      if (!isBlockEditorMessage(event.data) || event.data.type !== 'state') return
      const { source: _source, type: _type, ...next } = event.data as ParentMessage
      setState(next)
    }
    window.addEventListener('message', onMessage)
    send({ type: 'ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(() => send({ type: 'height', height: Math.ceil(root.getBoundingClientRect().height) }))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const blocks = state?.blocks || []
  const readOnly = Boolean(state?.readOnly)
  const ui = state?.scale ? 1 / state.scale : 1

  const targetAt = useCallback((x: number, y: number, skip?: number) => {
    const grid = gridRef.current
    if (!grid) return null
    const cells = blocks.flatMap((block, i) => {
      const el = cellRefs.current[i]
      if (!el || i === skip) return []
      return [{ i, rect: toRect(el.getBoundingClientRect()), fullWidth: String(block.columns || '6') === String(GRID_COLUMNS) }]
    })
    const target = findDropTarget(x, y, cells, toRect(grid.getBoundingClientRect()))
    // Map back to indices in the full list when the dragged module was skipped.
    const index = target.index < cells.length ? cells[target.index].i : (cells.length ? cells[cells.length - 1].i + 1 : 0)
    return { ...target, index }
  }, [blocks])

  // Files and modules dragged in from the admin.
  useEffect(() => {
    if (readOnly) return
    const accepts = (event: DragEvent) => {
      const types = Array.from(event.dataTransfer?.types || [])
      return types.includes('Files') || types.includes(BLOCK_DRAG_TYPE)
    }
    const onDragOver = (event: DragEvent) => {
      if (!accepts(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      setDropTarget(targetAt(event.clientX, event.clientY))
    }
    const onDragLeave = (event: DragEvent) => {
      if (!event.relatedTarget) setDropTarget(null)
    }
    const onDrop = (event: DragEvent) => {
      if (!accepts(event) || !event.dataTransfer) return
      event.preventDefault()
      const target = targetAt(event.clientX, event.clientY)
      setDropTarget(null)
      const index = target?.index ?? blocks.length
      const blockType = event.dataTransfer.getData(BLOCK_DRAG_TYPE)
      if (blockType) return send({ type: 'insert', index, blockType })
      const files = Array.from(event.dataTransfer.files).filter((file) => /^(image|video)\//.test(file.type))
      if (files.length) send({ type: 'files', index, files })
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [blocks.length, readOnly, targetAt])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') send({ type: 'select', index: null })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function startModulePointer(event: ReactPointerEvent, index: number) {
    if (event.button !== 0) return
    event.stopPropagation()
    send({ type: 'select', index })
    if (readOnly) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ kind: 'pending', index, x: event.clientX, y: event.clientY, pointerId: event.pointerId })
  }

  function startResize(event: ReactPointerEvent, index: number, axis: 'x' | 'y' | 'xy') {
    if (event.button !== 0 || readOnly) return
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const block = blocks[index]
    setDrag({ kind: 'resize', index, axis, columns: String(block.columns || '6'), rows: String(block.rows || 'wrap') })
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!drag) return
    if (drag.kind === 'pending') {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD) return
      setDrag({ kind: 'move', index: drag.index })
    }
    if (drag.kind === 'move' || drag.kind === 'pending') {
      setDropTarget(targetAt(event.clientX, event.clientY, drag.index))
      return
    }
    const cell = cellRefs.current[drag.index]
    const grid = gridRef.current
    if (!cell || !grid) return
    const cellRect = cell.getBoundingClientRect()
    const columns = drag.axis === 'y' ? drag.columns : String(columnsForWidth(event.clientX - cellRect.left, grid.getBoundingClientRect().width))
    const rows = drag.axis === 'x' ? drag.rows : String(rowsForHeight(event.clientY - cellRect.top))
    if (columns !== drag.columns || rows !== drag.rows) setDrag({ ...drag, columns, rows })
  }

  function onPointerUp() {
    if (!drag) return
    if (drag.kind === 'move' && dropTarget) {
      const to = moveDestination(drag.index, dropTarget.index)
      if (to !== drag.index) send({ type: 'move', from: drag.index, to })
    }
    if (drag.kind === 'resize') {
      const block = blocks[drag.index]
      if (drag.columns !== String(block.columns || '6') || drag.rows !== String(block.rows || 'wrap')) {
        send({ type: 'resize', index: drag.index, columns: drag.columns, rows: drag.rows })
      }
    }
    setDrag(null)
    setDropTarget(null)
  }

  const rootRect = rootRef.current?.getBoundingClientRect()
  const chrome = (style: CSSProperties): CSSProperties => ({ position: 'absolute', zIndex: 40, ...style })

  return (
    <div
      ref={rootRef}
      className="max-w-[1400px] mx-auto px-5 tablet:px-10 py-10"
      style={{ position: 'relative', minHeight: 320, cursor: drag?.kind === 'move' ? 'grabbing' : undefined }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setDrag(null); setDropTarget(null) }}
      onPointerDown={() => send({ type: 'select', index: null })}
    >
      <div ref={gridRef} className="grid grid-cols-1 desktop:grid-cols-6 desktop:grid-flow-dense gap-5 tablet:gap-10 content-block-grid">
        {blocks.map((block, i) => {
          const resizing = drag?.kind === 'resize' && drag.index === i ? drag : null
          const shown = resizing ? { ...block, columns: resizing.columns, rows: resizing.rows === 'wrap' ? undefined : resizing.rows } : block
          const Module = blockComponents[block.blockType]
          const label = blockLabels[block.blockType] || block.blockType
          const classes = staticModuleClassNames(shown)
          const selected = state?.selected === i
          const active = selected || hovered === i
          const isShareImage = state?.shareImage?.index === i
          const canResizeHeight = fixedHeightBlockTypes.includes(block.blockType)
          const columns = String(shown.columns || '6')
          const rows = String(shown.rows || 'wrap')
          const sizeLabel = `${columns}/6${canResizeHeight ? ` · ${rows === 'wrap' ? 'auto height' : `${rows} row${rows === '1' ? '' : 's'}`}` : ''}`

          return (
            <div
              key={block.id || i}
              ref={(el) => { cellRefs.current[i] = el }}
              className={classes.cell}
              style={{ position: 'relative', opacity: drag?.kind === 'move' && drag.index === i ? 0.35 : 1 }}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered((current) => (current === i ? null : current))}
            >
              <div className={cn(classes.content, 'h-full')} data-lightbox-surface-state="source">
                {Module && hasMedia(shown) ? (
                  <ModuleBoundary label={label}><Module {...shown} /></ModuleBoundary>
                ) : (
                  <Placeholder>{Module ? emptyLabel(block) : `${label} isn’t supported here`}</Placeholder>
                )}
              </div>

              {/* Captures clicks so videos, links and 3D devices don't react while editing. */}
              <div
                style={chrome({
                  inset: 0,
                  zIndex: 30,
                  cursor: readOnly ? 'default' : 'grab',
                  outline: active ? `${(selected ? 2 : 1) * ui}px solid ${ACCENT}` : undefined,
                  outlineOffset: 0,
                })}
                onPointerDown={(event) => startModulePointer(event, i)}
              />

              {(active || isShareImage) && (
                <div style={chrome({ top: 0, left: 0, transform: `scale(${ui})`, transformOrigin: 'top left', display: 'flex', gap: 4, padding: 6, pointerEvents: 'none' })}>
                  {active && <Chip background={ACCENT}>{label} · {sizeLabel}</Chip>}
                  {isShareImage && <Chip background="#111">{state?.shareImage?.auto ? 'Share image (auto)' : 'Share image'}</Chip>}
                </div>
              )}

              {selected && !readOnly && (
                <div style={chrome({ top: 0, right: 0, transform: `scale(${ui})`, transformOrigin: 'top right', display: 'flex', gap: 4, padding: 6 })}>
                  <ToolButton label="Drag to move" onPointerDown={(event) => startModulePointer(event, i)}><GripVertical size={16} /></ToolButton>
                  {state?.canSetShareImage && block.blockType !== 'text' && block.image ? (
                    <ToolButton label="Use as share image" onClick={() => send({ type: 'shareImage', index: i })}><Share2 size={16} /></ToolButton>
                  ) : null}
                  <ToolButton label="Duplicate" onClick={() => send({ type: 'duplicate', index: i })}><Copy size={16} /></ToolButton>
                  <ToolButton label="Remove" onClick={() => send({ type: 'remove', index: i })}><Trash2 size={16} /></ToolButton>
                </div>
              )}

              {active && !readOnly && (
                <>
                  <Handle
                    label="Drag to change width"
                    style={{ top: '50%', right: 0, width: 10 * ui, height: 48 * ui, transform: 'translate(50%, -50%)', cursor: 'ew-resize' }}
                    onPointerDown={(event) => startResize(event, i, 'x')}
                  />
                  {canResizeHeight && (
                    <>
                      <Handle
                        label="Drag to change height. Double-click for auto height."
                        style={{ bottom: 0, left: '50%', width: 48 * ui, height: 10 * ui, transform: 'translate(-50%, 50%)', cursor: 'ns-resize' }}
                        onPointerDown={(event) => startResize(event, i, 'y')}
                        onDoubleClick={() => send({ type: 'resize', index: i, columns, rows: 'wrap' })}
                      />
                      <Handle
                        label="Drag to resize"
                        style={{ bottom: 0, right: 0, width: 14 * ui, height: 14 * ui, transform: 'translate(50%, 50%)', cursor: 'nwse-resize', borderRadius: 3 * ui }}
                        onPointerDown={(event) => startResize(event, i, 'xy')}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {state && !blocks.length && (
        <div
          className="text-text-muted"
          style={{ border: `${2 * ui}px dashed currentColor`, opacity: 0.6, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 * ui }}
        >
          Drop images or videos here, or add a module above
        </div>
      )}

      {dropTarget && rootRect && (
        <div
          style={chrome({
            zIndex: 50,
            pointerEvents: 'none',
            background: ACCENT,
            borderRadius: 4 * ui,
            ...(dropTarget.bar.orientation === 'horizontal'
              ? { left: dropTarget.bar.x - rootRect.left, top: dropTarget.bar.y - rootRect.top - 2 * ui, width: dropTarget.bar.length, height: 4 * ui }
              : { left: dropTarget.bar.x - rootRect.left - 2 * ui, top: dropTarget.bar.y - rootRect.top, width: 4 * ui, height: dropTarget.bar.length }),
          })}
        />
      )}
    </div>
  )
}

function Chip({ children, background }: { children: ReactNode; background: string }) {
  return (
    <span style={{ background, color: '#fff', font: '500 12px/1 system-ui, sans-serif', padding: '6px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function ToolButton({ label, children, onClick, onPointerDown }: {
  label: string
  children: ReactNode
  onClick?: () => void
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onPointerDown={(event) => {
        event.stopPropagation()
        onPointerDown?.(event)
      }}
      style={{
        width: 30,
        height: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        color: '#111',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        cursor: onPointerDown ? 'grab' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Handle({ label, style, onPointerDown, onDoubleClick }: {
  label: string
  style: CSSProperties
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onDoubleClick?: () => void
}) {
  return (
    <div
      role="separator"
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      style={{ position: 'absolute', zIndex: 45, background: '#fff', border: `1px solid ${ACCENT}`, borderRadius: 999, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', touchAction: 'none', ...style }}
    />
  )
}

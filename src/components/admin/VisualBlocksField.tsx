'use client'

import { BlocksField, useField, useForm, useFormFields, useUploadHandlers } from '@payloadcms/ui'
import type { BlocksFieldClientComponent, ClientBlock } from 'payload'
import { reduceFieldsToValues } from 'payload/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BLOCK_DRAG_TYPE,
  BLOCK_EDITOR_SOURCE,
  CANVAS_WIDTH,
  blockForFile,
  isBlockEditorMessage,
  mediaId,
  unresolvedMediaIds,
  withResolvedMedia,
  type CanvasBlock,
  type CanvasMessage,
  type MediaDoc,
  type ParentMessage,
} from '@/lib/blockEditor'
import { firstContentImageIndex } from '@/lib/projectMetadata'
import { useMediaDocs } from './useMediaDocs'
import './VisualBlocksField.scss'

const SHARE_IMAGE_PATH = 'meta.image'
const MODE_STORAGE_KEY = 'visual-blocks-mode'

function valueAtPath(data: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined), data)
}

function blockLabel(block: ClientBlock) {
  const singular = block.labels?.singular
  return typeof singular === 'string' ? singular : block.slug
}

function readStoredMode() {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === 'list' ? 'list' : 'visual'
  } catch {
    return 'visual'
  }
}

export const VisualBlocksField: BlocksFieldClientComponent = (props) => {
  const { field, readOnly: readOnlyProp } = props
  const { addFieldRow, dispatchFields, moveFieldRow, removeFieldRow, setModified } = useForm()
  const { getUploadHandler } = useUploadHandlers()
  const { path, rows = [], disabled } = useField({ hasRows: true, potentiallyStalePath: props.path })
  const fields = useFormFields(([formFields]) => formFields)
  const readOnly = Boolean(readOnlyProp || disabled)

  const [mode, setMode] = useState<'visual' | 'list'>('visual')
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  const [canvasHeight, setCanvasHeight] = useState(480)
  const [width, setWidth] = useState(0)
  // Counts canvas loads, so a remounted frame (after List view) gets the state again.
  const [canvasLoads, setCanvasLoads] = useState(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMode(readStoredMode()), [])

  const chooseMode = (next: 'visual' | 'list') => {
    setMode(next)
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next)
    } catch {}
  }

  const blocks = useMemo(() => {
    const value = valueAtPath(reduceFieldsToValues(fields, true), path)
    return (Array.isArray(value) ? value : []) as CanvasBlock[]
  }, [fields, path])

  const hasShareImageField = SHARE_IMAGE_PATH in fields
  const shareImageId = hasShareImageField ? mediaId(fields[SHARE_IMAGE_PATH]?.value) : null

  // The form keeps uploads as IDs; fetch the documents so the canvas can draw them.
  const { docs: media, remember: rememberMedia } = useMediaDocs(unresolvedMediaIds(blocks, {}))

  const previewBlocks = useMemo(() => withResolvedMedia(blocks, media), [blocks, media])

  const shareImage = useMemo<ParentMessage['shareImage']>(() => {
    if (shareImageId) {
      const index = blocks.findIndex((block) => mediaId(block.image) === shareImageId)
      return index >= 0 ? { index, auto: false } : null
    }
    const index = firstContentImageIndex(previewBlocks)
    return index >= 0 ? { index, auto: true } : null
  }, [blocks, previewBlocks, shareImageId])

  useEffect(() => {
    if (selected !== null && selected >= blocks.length) setSelected(blocks.length ? blocks.length - 1 : null)
  }, [blocks.length, selected])

  // Size the desktop-width canvas down to whatever space the admin gives it.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(stage)
    return () => observer.disconnect()
  }, [mode, expanded])

  const scale = width ? width / CANVAS_WIDTH : 0.5

  useEffect(() => {
    const target = frameRef.current?.contentWindow
    if (!target || !canvasLoads) return
    const message: ParentMessage = {
      source: BLOCK_EDITOR_SOURCE,
      type: 'state',
      blocks: previewBlocks,
      selected,
      shareImage,
      scale,
      readOnly,
      canSetShareImage: hasShareImageField,
    }
    target.postMessage(message, window.location.origin)
  }, [canvasLoads, hasShareImageField, previewBlocks, readOnly, scale, selected, shareImage])

  // Open only the selected module's settings.
  const selectedRowID = selected !== null ? rows[selected]?.id : undefined
  useEffect(() => {
    if (!selectedRowID) return
    const updatedRows = rows.map((row) => ({ ...row, collapsed: row.id !== selectedRowID }))
    if (updatedRows.every((row, i) => row.collapsed === rows[i].collapsed)) return
    dispatchFields({ type: 'SET_ROW_COLLAPSED', path, updatedRows })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRowID])

  const uploadMedia = useCallback(async (file: File): Promise<MediaDoc> => {
    let upload: Blob | string = file
    const handler = getUploadHandler({ collectionSlug: 'media' })
    if (typeof handler === 'function') {
      // Production uploads go straight to storage, then Payload records the file.
      let filename = file.name
      const clientUploadContext = await handler({ file, updateFilename: (value: string) => { filename = value } })
      upload = JSON.stringify({ clientUploadContext, collectionSlug: 'media', filename, mimeType: file.type, size: file.size })
    }
    const body = new FormData()
    body.append('_payload', JSON.stringify({}))
    body.append('file', upload)
    const response = await fetch('/api/media', { method: 'POST', body, credentials: 'include' })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.doc) throw new Error(result?.errors?.[0]?.message || `Upload failed (${response.status})`)
    return result.doc as MediaDoc
  }, [getUploadHandler])

  const insertBlock = useCallback((index: number, blockType: string, subFieldState: Record<string, unknown> = {}) => {
    addFieldRow({ blockType, path, rowIndex: index, schemaPath: props.schemaPath ?? path, subFieldState: subFieldState as never })
    setSelected(index)
  }, [addFieldRow, path, props.schemaPath])

  const insertFiles = useCallback(async (index: number, files: File[]) => {
    setError('')
    setUploading((count) => count + files.length)
    let at = index
    for (const file of files) {
      try {
        const doc = await uploadMedia(file)
        rememberMedia(doc)
        const { blockType, field: uploadField } = blockForFile(file)
        insertBlock(at, blockType, { [uploadField]: { initialValue: doc.id, value: doc.id, valid: true } })
        at += 1
      } catch (uploadError) {
        setError(`${file.name}: ${uploadError instanceof Error ? uploadError.message : 'upload failed'}`)
      } finally {
        setUploading((count) => count - 1)
      }
    }
  }, [insertBlock, rememberMedia, uploadMedia])

  const updateRowField = useCallback((index: number, name: string, value: unknown) => {
    dispatchFields({ type: 'UPDATE', path: `${path}.${index}.${name}`, value })
    setModified(true)
  }, [dispatchFields, path, setModified])

  const handlers = useRef<(message: CanvasMessage) => void>(() => {})
  handlers.current = (message) => {
    switch (message.type) {
      case 'ready':
        setCanvasLoads((count) => count + 1)
        break
      case 'height':
        setCanvasHeight(message.height)
        break
      case 'select':
        setSelected(message.index)
        break
      case 'move':
        moveFieldRow({ path, moveFromIndex: message.from, moveToIndex: message.to })
        setSelected(message.to)
        break
      case 'resize':
        updateRowField(message.index, 'columns', message.columns)
        if (message.rows !== String(blocks[message.index]?.rows || 'wrap')) updateRowField(message.index, 'rows', message.rows)
        break
      case 'remove':
        removeFieldRow({ path, rowIndex: message.index })
        setSelected(null)
        break
      case 'duplicate':
        dispatchFields({ type: 'DUPLICATE_ROW', path, rowIndex: message.index })
        setModified(true)
        setSelected(message.index + 1)
        break
      case 'insert':
        insertBlock(message.index, message.blockType)
        break
      case 'files':
        void insertFiles(message.index, message.files)
        break
      case 'shareImage': {
        const value = blocks[message.index]?.image
        const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : value
        if (hasShareImageField && id !== undefined && id !== null) {
          dispatchFields({ type: 'UPDATE', path: SHARE_IMAGE_PATH, value: id })
          setModified(true)
        }
        break
      }
    }
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      if (isBlockEditorMessage(event.data)) handlers.current(event.data as CanvasMessage)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [expanded])

  const blockTypes = (field.blocks || []) as ClientBlock[]
  const insertionIndex = selected === null ? blocks.length : selected + 1
  const selectedBlock = selected !== null ? blockTypes.find((block) => block.slug === blocks[selected]?.blockType) : undefined
  const rowDomID = `${path.split('.').join('-')}-row-${selected}`

  if (mode === 'list') {
    return (
      <div className="visual-blocks">
        <ModeToggle mode={mode} onChange={chooseMode} />
        <BlocksField {...props} />
      </div>
    )
  }

  return (
    <div className={`visual-blocks${expanded ? ' visual-blocks--expanded' : ''}`}>
      <div className="visual-blocks__toolbar">
        <ModeToggle mode={mode} onChange={chooseMode} />
        {!readOnly && (
          <div className="visual-blocks__palette" aria-label="Add a module">
            {blockTypes.map((block) => (
              <button
                key={block.slug}
                type="button"
                draggable
                className="visual-blocks__palette-item"
                title={`Add ${blockLabel(block)} — or drag it into the page`}
                onClick={() => insertBlock(insertionIndex, block.slug)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(BLOCK_DRAG_TYPE, block.slug)
                  event.dataTransfer.effectAllowed = 'copy'
                }}
              >
                {block.imageURL && <img src={block.imageURL} alt="" />}
                <span>{blockLabel(block)}</span>
              </button>
            ))}
            <label className="visual-blocks__palette-item visual-blocks__upload" title="Upload images or videos as new modules">
              <span>Upload…</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || [])
                  event.target.value = ''
                  if (files.length) void insertFiles(insertionIndex, files)
                }}
              />
            </label>
          </div>
        )}
        <div className="visual-blocks__status">
          {uploading > 0 && <span>Uploading {uploading}…</span>}
          {error && <span className="visual-blocks__error">{error}</span>}
        </div>
        <button type="button" className="visual-blocks__expand" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Done' : 'Full screen'}
        </button>
      </div>

      <div className="visual-blocks__body">
        <div className="visual-blocks__stage-scroll">
          <div ref={stageRef} className="visual-blocks__stage" style={{ height: canvasHeight * scale }}>
            <iframe
              ref={frameRef}
              src="/block-canvas"
              title="Content preview"
              className="visual-blocks__frame"
              style={{ width: CANVAS_WIDTH, height: canvasHeight, transform: `scale(${scale})` }}
            />
          </div>
          <p className="visual-blocks__hint">
            Click a module to edit it. Drag to reorder, drag its edges to resize, and drop images or videos anywhere to add them.
          </p>
        </div>

        <aside className="visual-blocks__settings">
          {selected === null || !selectedBlock ? (
            <p className="visual-blocks__empty">Select a module to edit its settings.</p>
          ) : (
            <>
              <style>{`.visual-blocks__settings .blocks-field__rows > :not([id="${rowDomID}"]) { display: none; }`}</style>
              <BlocksField {...props} />
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function ModeToggle({ mode, onChange }: { mode: 'visual' | 'list'; onChange: (mode: 'visual' | 'list') => void }) {
  return (
    <div className="visual-blocks__modes" role="group" aria-label="Content view">
      <button type="button" aria-pressed={mode === 'visual'} onClick={() => onChange('visual')}>Visual</button>
      <button type="button" aria-pressed={mode === 'list'} onClick={() => onChange('list')}>List</button>
    </div>
  )
}

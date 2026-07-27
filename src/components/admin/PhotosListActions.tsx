'use client'

import { Button, toast, useConfig, useListQuery, useRouteTransition } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'

const uploadEventName = 'photos-list-upload'

type UploadItem = {
  createdAt: number
  docID?: number | string
  filename?: string | null
  id: string
  name: string
  progress: number
  previewURL: string
  status: 'uploading' | 'done' | 'error'
}

type UploadEventDetail =
  | { type: 'add'; items: UploadItem[] }
  | {
      type: 'update'
      doc?: UploadedPhotoDoc
      filename?: string | null
      id: string
      progress?: number
      status?: UploadItem['status']
    }
  | { type: 'remove'; ids: string[] }

type SignedUploadResponse = {
  docPrefix?: string
  filename: string
  url: string
}

type StorageUploadResult = {
  filename: string
  payload: string
}

type UploadedPhotoDoc = {
  createdAt?: string | null
  filename?: string | null
  id?: number | string
  updatedAt?: string | null
}

function emitUploadEvent(detail: UploadEventDetail) {
  window.dispatchEvent(new CustomEvent(uploadEventName, { detail }))
}

function createUploadID(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${index}-${Date.now()}`
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0
  return Math.min(Math.max(progress, 0), 1)
}

async function getResponseMessage(response: Response, fallback: string) {
  let text = ''

  try {
    text = await response.text()
  } catch {
    return fallback
  }

  if (!text) return fallback

  try {
    const data = JSON.parse(text)
    return data?.errors?.[0]?.message || data?.message || fallback
  } catch {
    return text
  }
}

function uploadWithProgress({
  file,
  onProgress,
  url,
}: {
  file: File
  onProgress: (progress: number) => void
  url: string
}) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('PUT', url)
    request.setRequestHeader('Content-Type', file.type)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total)
      }
    }
    request.onerror = () => reject(new Error(`Storage upload failed for ${file.name}: network error`))
    request.onabort = () => reject(new Error(`Storage upload cancelled for ${file.name}`))
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1)
        resolve()
        return
      }

      reject(new Error(`Storage upload failed for ${file.name}: ${request.status} ${request.statusText}`))
    }
    request.send(file)
  })
}

function getProgressStyle(progress: number) {
  return { '--photos-upload-progress': clampProgress(progress) } as CSSProperties
}

function getUploadProgressLabel(item: UploadItem) {
  if (item.status === 'done') return 'added'
  if (item.status === 'error') return 'upload failed'
  return `${Math.round(clampProgress(item.progress) * 100)}% uploaded`
}

function getNextUploadItems(current: UploadItem[], detail: Extract<UploadEventDetail, { type: 'update' }>) {
  return current.map((item) => {
    if (item.id !== detail.id) return item

    const docFields = detail.doc ? getUploadDocFields(detail.doc) : {}

    return {
      ...item,
      ...docFields,
      ...(detail.filename !== undefined ? { filename: detail.filename } : {}),
      ...(typeof detail.progress === 'number' ? { progress: clampProgress(detail.progress) } : {}),
      ...(detail.status ? { status: detail.status } : {}),
    }
  })
}

function getStorageProgress(progress: number) {
  return 0.04 + clampProgress(progress) * 0.86
}

function getPhotoRecordPayload({ file, filename, prefix }: { file: File; filename: string; prefix?: string }) {
  return JSON.stringify({
    clientUploadContext: { prefix },
    collectionSlug: 'photos',
    filename,
    mimeType: file.type,
    size: file.size,
  })
}

function getUploadErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  return message === 'Something went wrong.' ? fallback : message
}

function getUploadItem(file: File, index: number): UploadItem {
  return {
    createdAt: Date.now(),
    id: createUploadID(file, index),
    name: file.name,
    progress: 0,
    previewURL: URL.createObjectURL(file),
    status: 'uploading',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function getPhotoDocID(doc?: UploadedPhotoDoc) {
  if (doc?.id === undefined || doc.id === null) return undefined
  return String(doc.id)
}

function getUploadDocFields(doc: UploadedPhotoDoc): Pick<UploadItem, 'docID' | 'filename'> {
  return {
    docID: doc.id,
    filename: doc.filename,
  }
}

function getUploadedPhotoDoc(data: unknown): UploadedPhotoDoc | undefined {
  if (!isRecord(data)) return undefined

  const candidate = isRecord(data.doc) ? data.doc : isRecord(data.result) ? data.result : data
  if (!isRecord(candidate)) return undefined

  if (!('id' in candidate) && !('filename' in candidate)) {
    return undefined
  }

  return candidate as UploadedPhotoDoc
}

async function getJSON(response: Response) {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function wasPhotoCreatedForUpload(photo: UploadedPhotoDoc, item: UploadItem) {
  const timestamp = Date.parse(photo.createdAt || photo.updatedAt || '')

  if (!Number.isFinite(timestamp)) {
    return true
  }

  return timestamp >= item.createdAt - 1000
}

function doesPhotoMatchUploadItem(photo: UploadedPhotoDoc, item: UploadItem) {
  const uploadDocID = item.docID === undefined || item.docID === null ? undefined : String(item.docID)

  if (uploadDocID && getPhotoDocID(photo) === uploadDocID) {
    return true
  }

  if (!wasPhotoCreatedForUpload(photo, item)) {
    return false
  }

  return isNonEmptyString(item.filename) && photo.filename === item.filename
}

function isUploadRepresentedInPhotos(item: UploadItem, photos: UploadedPhotoDoc[]) {
  return item.status === 'done' && photos.some((photo) => doesPhotoMatchUploadItem(photo, item))
}

export function PhotosListAddAction() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { startRouteTransition } = useRouteTransition()
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig()
  const [uploading, setUploading] = useState(false)

  const uploadToStorage = async (
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<StorageUploadResult> => {
    const signedURLResponse = await fetch(
      formatAdminURL({
        apiRoute,
        path: '/storage-s3-generate-signed-url',
      }),
      {
        body: JSON.stringify({
          collectionSlug: 'photos',
          filename: file.name,
          filesize: file.size,
          mimeType: file.type,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    )

    if (!signedURLResponse.ok) {
      throw new Error(
        await getResponseMessage(signedURLResponse, `Could not prepare upload for ${file.name}`),
      )
    }

    const { docPrefix, filename, url } = (await signedURLResponse.json()) as SignedUploadResponse
    onProgress(0.04)

    try {
      await uploadWithProgress({
        file,
        onProgress: (progress) => onProgress(getStorageProgress(progress)),
        url,
      })
    } catch (error) {
      throw new Error(getUploadErrorMessage(error, `Storage upload failed for ${file.name}`))
    }

    return {
      filename,
      payload: getPhotoRecordPayload({
        file,
        filename,
        prefix: docPrefix,
      }),
    }
  }

  const uploadFile = async (file: File, id: string) => {
    const body = new FormData()
    body.append('_payload', JSON.stringify({}))
    const uploadResult = await uploadToStorage(file, (progress) =>
      emitUploadEvent({ id, progress, type: 'update' }),
    )
    body.append('file', uploadResult.payload)
    emitUploadEvent({ filename: uploadResult.filename, id, progress: 0.94, type: 'update' })

    const response = await fetch(
      formatAdminURL({
        apiRoute,
        path: '/photos',
      }),
      {
        body,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
        method: 'POST',
      },
    )

    if (!response.ok) {
      const message = await getResponseMessage(response, `Failed to create photo record for ${file.name}`)
      throw new Error(
        message === 'Something went wrong.' || /expected response from the upload handler/i.test(message)
          ? `Could not create ${file.name}. The file reached storage, but the photo record could not be created.`
          : message,
      )
    }

    const uploadedDoc = getUploadedPhotoDoc(await getJSON(response))
    emitUploadEvent({
      doc: uploadedDoc,
      filename: uploadedDoc?.filename || uploadResult.filename,
      id,
      progress: 1,
      status: 'done',
      type: 'update',
    })
  }

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length || uploading) {
      return
    }

    const items = files.map(getUploadItem)
    const ids = items.map((item) => item.id)

    emitUploadEvent({ items, type: 'add' })
    setUploading(true)

    const failures: string[] = []

    for (const [index, item] of items.entries()) {
      const file = files[index]
      try {
        await uploadFile(file, item.id)
      } catch (error) {
        emitUploadEvent({ id: item.id, progress: 1, status: 'error', type: 'update' })
        failures.push(getUploadErrorMessage(error, `Failed to upload ${file.name}`))
      }
    }

    setUploading(false)
    startRouteTransition(() => router.refresh())

    if (failures.length) {
      toast.error(failures[0])
    } else {
      toast.success(files.length === 1 ? 'Photo uploaded' : `${files.length} photos uploaded`)
    }

    window.setTimeout(() => {
      emitUploadEvent({ ids, type: 'remove' })
      items.forEach((item) => URL.revokeObjectURL(item.previewURL))
    }, 1800)
  }

  return (
    <div className="photos-list-add-action">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="photos-list-add-action__input"
        onChange={(event) => {
          void handleFiles(event)
        }}
      />
      <Button
        buttonStyle="pill"
        className="photos-list-add-action__button"
        disabled={uploading}
        margin={false}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Creating...' : 'Create New'}
      </Button>
    </div>
  )
}

export function PhotosListUploadStatus() {
  const { data } = useListQuery()
  const [items, setItems] = useState<UploadItem[]>([])
  const photos = useMemo(() => ((data?.docs || []) as UploadedPhotoDoc[]).filter(Boolean), [data?.docs])
  const visibleItems = useMemo(
    () => items.filter((item) => !isUploadRepresentedInPhotos(item, photos)),
    [items, photos],
  )

  useEffect(() => {
    const representedItems = items.filter((item) => isUploadRepresentedInPhotos(item, photos))

    if (!representedItems.length) {
      return
    }

    const timeoutID = window.setTimeout(() => {
      setItems((current) =>
        current.filter((item) => {
          const isRepresented = isUploadRepresentedInPhotos(item, photos)

          if (isRepresented) {
            URL.revokeObjectURL(item.previewURL)
          }

          return !isRepresented
        }),
      )
    }, 0)

    return () => window.clearTimeout(timeoutID)
  }, [items, photos])

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const { detail } = event as CustomEvent<UploadEventDetail>

      if (detail.type === 'add') {
        setItems((current) => [...detail.items, ...current])
      }

      if (detail.type === 'update') {
        setItems((current) => getNextUploadItems(current, detail))
      }

      if (detail.type === 'remove') {
        setItems((current) => current.filter((item) => !detail.ids.includes(item.id)))
      }
    }

    window.addEventListener(uploadEventName, handleEvent)
    return () => window.removeEventListener(uploadEventName, handleEvent)
  }, [])

  if (!visibleItems.length) {
    return null
  }

  return (
    <div className="photos-upload-status" aria-live="polite">
      {visibleItems.map((item) => (
        <div
          aria-label={`${item.name} ${getUploadProgressLabel(item)}`}
          className={`photos-upload-status__item photos-upload-status__item--${item.status}`}
          key={item.id}
          role="status"
        >
          <div className="photos-upload-status__thumb" aria-hidden="true">
            <img src={item.previewURL} alt="" />
          </div>
          {item.status === 'uploading' && (
            <div
              className="photos-upload-status__progress"
              style={getProgressStyle(item.progress)}
              aria-hidden="true"
            >
              <span />
            </div>
          )}
          <span className="photos-upload-status__label">
            {getUploadProgressLabel(item)}
          </span>
        </div>
      ))}
    </div>
  )
}

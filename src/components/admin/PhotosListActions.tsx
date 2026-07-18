'use client'

import { Button, toast, useConfig, useRouteTransition } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'

const uploadEventName = 'photos-list-upload'

type UploadItem = {
  id: string
  name: string
  previewURL: string
  status: 'uploading' | 'done' | 'error'
}

type UploadEventDetail =
  | { type: 'add'; items: UploadItem[] }
  | { type: 'update'; id: string; status: UploadItem['status'] }
  | { type: 'remove'; ids: string[] }

type SignedUploadResponse = {
  docPrefix?: string
  filename: string
  url: string
}

function emitUploadEvent(detail: UploadEventDetail) {
  window.dispatchEvent(new CustomEvent(uploadEventName, { detail }))
}

function createUploadID(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${index}-${Date.now()}`
}

async function getResponseMessage(response: Response, fallback: string) {
  try {
    const data = await response.json()
    return data?.errors?.[0]?.message || data?.message || fallback
  } catch {
    return fallback
  }
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

  const uploadToStorage = async (file: File) => {
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

    let storageResponse: Response
    try {
      storageResponse = await fetch(url, {
        body: file,
        headers: {
          'Content-Type': file.type,
        },
        method: 'PUT',
      })
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Storage upload failed for ${file.name}: ${error.message}`
          : `Storage upload failed for ${file.name}`,
      )
    }

    if (!storageResponse.ok) {
      throw new Error(`Storage upload failed for ${file.name}: ${storageResponse.status} ${storageResponse.statusText}`)
    }

    return JSON.stringify({
      clientUploadContext: { prefix: docPrefix },
      collectionSlug: 'photos',
      filename,
      mimeType: file.type,
      size: file.size,
    })
  }

  const uploadFile = async (file: File, id: string) => {
    const body = new FormData()
    body.append('_payload', JSON.stringify({}))
    body.append('file', await uploadToStorage(file))

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
      throw new Error(await getResponseMessage(response, `Failed to create photo record for ${file.name}`))
    }

    emitUploadEvent({ id, status: 'done', type: 'update' })
  }

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length || uploading) {
      return
    }

    const items = files.map((file, index) => ({
      id: createUploadID(file, index),
      name: file.name,
      previewURL: URL.createObjectURL(file),
      status: 'uploading' as const,
    }))
    const ids = items.map((item) => item.id)

    emitUploadEvent({ items, type: 'add' })
    setUploading(true)

    const failures: string[] = []

    for (const [index, item] of items.entries()) {
      const file = files[index]
      try {
        await uploadFile(file, item.id)
      } catch (error) {
        emitUploadEvent({ id: item.id, status: 'error', type: 'update' })
        failures.push(error instanceof Error ? error.message : `Failed to upload ${file.name}`)
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
  const [items, setItems] = useState<UploadItem[]>([])

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const { detail } = event as CustomEvent<UploadEventDetail>

      if (detail.type === 'add') {
        setItems((current) => [...detail.items, ...current])
      }

      if (detail.type === 'update') {
        setItems((current) =>
          current.map((item) => (item.id === detail.id ? { ...item, status: detail.status } : item)),
        )
      }

      if (detail.type === 'remove') {
        setItems((current) => current.filter((item) => !detail.ids.includes(item.id)))
      }
    }

    window.addEventListener(uploadEventName, handleEvent)
    return () => window.removeEventListener(uploadEventName, handleEvent)
  }, [])

  if (!items.length) {
    return null
  }

  return (
    <div className="photos-upload-status" aria-live="polite">
      {items.map((item) => (
        <div
          aria-label={`${item.name} ${item.status === 'uploading' ? 'uploading' : item.status === 'done' ? 'added' : 'upload failed'}`}
          className={`photos-upload-status__item photos-upload-status__item--${item.status}`}
          key={item.id}
          role="status"
        >
          <div className="photos-upload-status__thumb" aria-hidden="true">
            <img src={item.previewURL} alt="" />
          </div>
        </div>
      ))}
    </div>
  )
}

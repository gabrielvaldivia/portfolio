'use client'

import {
  Gutter,
  ListControls,
  ListHeader,
  SelectMany,
  SelectionProvider,
  TableColumnsProvider,
  useBulkUpload,
  useConfig,
  useListDrawerContext,
  useListQuery,
  useModal,
  useStepNav,
  useTranslation,
  useWindowInfo,
  toast,
} from '@payloadcms/ui'
import { getTranslation } from '@payloadcms/translations'
import { Cancel01Icon, Copy01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import * as qs from 'qs-esm'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { ListViewClientProps } from 'payload'
import { AdminHugeIcon } from './Hugeicons'

type MediaSize = {
  height?: number | null
  url?: string | null
  width?: number | null
}

type MediaDoc = {
  alt?: string | null
  createdAt?: string | null
  filename?: string | null
  filesize?: number | string | null
  height?: number | null
  id: number | string
  mimeType?: string | null
  sizes?: Record<string, MediaSize | undefined> | null
  thumbnailURL?: string | null
  updatedAt?: string | null
  url?: string | null
  width?: number | null
}

type MediaAPIResponse = {
  docs?: MediaDoc[]
  hasNextPage?: boolean
  nextPage?: number | null
  totalDocs?: number
}

type MediaDraft = {
  alt: string
}

const emptyMediaDraft: MediaDraft = {
  alt: '',
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

function getPreviewURL(media: MediaDoc) {
  return (
    media.sizes?.medium?.url ||
    media.sizes?.small?.url ||
    media.thumbnailURL ||
    media.sizes?.thumbnail?.url ||
    media.url
  )
}

function getFullMediaURL(media: MediaDoc) {
  return media.url || getPreviewURL(media)
}

function getAspectRatio(media: MediaDoc) {
  const size = media.sizes?.medium || media.sizes?.small || media.sizes?.thumbnail
  const width = size?.width || media.width
  const height = size?.height || media.height

  if (!width || !height) return undefined
  return `${width} / ${height}`
}

function getExtension(filename?: string | null) {
  const extension = filename?.split('.').pop()
  return extension ? extension.toUpperCase() : 'FILE'
}

function getMediaTitle(media: MediaDoc) {
  return media.alt || media.filename || `Media ${media.id}`
}

function formatMediaDate(value: string | null | undefined, language: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatVideoDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return null

  const totalSeconds = Math.round(duration)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getPreviewStyle(media: MediaDoc) {
  const aspectRatio = getAspectRatio(media)

  return aspectRatio ? ({ '--media-card-aspect-ratio': aspectRatio } as CSSProperties) : undefined
}

function getMediaID(media: MediaDoc) {
  return String(media.id)
}

function getDraftValue(value: number | string | null | undefined) {
  return value === undefined || value === null ? '' : String(value)
}

function getMediaDraft(media: MediaDoc): MediaDraft {
  return {
    alt: getDraftValue(media.alt),
  }
}

function getMediaUpdatePayload(media: MediaDoc, draft: MediaDraft) {
  const payload: Partial<MediaDoc> = {}
  const nextAlt = draft.alt.trim()

  if (nextAlt !== (media.alt || '')) payload.alt = nextAlt

  return payload
}

function mergeMediaDocs(currentDocs: MediaDoc[], nextDocs: MediaDoc[]) {
  const seen = new Set(currentDocs.map(getMediaID))
  const uniqueNextDocs = nextDocs.filter((doc) => {
    const id = getMediaID(doc)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  return [...currentDocs, ...uniqueNextDocs]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getLazyLoadWhere(query?: Record<string, unknown>) {
  const search = typeof query?.search === 'string' ? query.search.trim() : ''
  const where = query?.where

  if (!search) return where

  const searchWhere = { alt: { like: search } }

  if (isRecord(where) && Object.keys(where).length > 0) {
    return { and: [where, searchWhere] }
  }

  return searchWhere
}

function getLazyLoadQueryString({
  limit,
  page,
  query,
}: {
  limit: number
  page: number
  query?: Record<string, unknown>
}) {
  const {
    columns: _columns,
    page: _page,
    queryByGroup: _queryByGroup,
    search: _search,
    where: _where,
    ...queryForAPI
  } = query || {}
  const where = getLazyLoadWhere(query)

  return qs.stringify(
    {
      ...queryForAPI,
      depth: 0,
      limit,
      page,
      ...(where ? { where } : {}),
    },
    { addQueryPrefix: true },
  )
}

function MediaPreview({ media }: { media: MediaDoc }) {
  const previewURL = getPreviewURL(media)
  const title = getMediaTitle(media)
  const isVideo = media.mimeType?.startsWith('video/')
  const isImage = media.mimeType?.startsWith('image/')
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | undefined>(() => getAspectRatio(media))
  const [videoDuration, setVideoDuration] = useState<string | null>(null)

  if (previewURL && isVideo) {
    return (
      <>
        <video
          aria-label={title}
          muted
          onLoadedMetadata={(event) => {
            const { duration, videoHeight, videoWidth } = event.currentTarget

            if (videoWidth && videoHeight) {
              setVideoAspectRatio(`${videoWidth} / ${videoHeight}`)
            }

            setVideoDuration(formatVideoDuration(duration))
          }}
          playsInline
          preload="metadata"
          src={previewURL}
          style={
            videoAspectRatio
              ? ({ '--media-card-aspect-ratio': videoAspectRatio } as CSSProperties)
              : undefined
          }
        />
        {videoDuration ? <span className="media-masonry-card__badge">{videoDuration}</span> : null}
      </>
    )
  }

  if (previewURL && isImage) {
    return <img alt={media.alt || ''} loading="lazy" src={previewURL} />
  }

  return (
    <span className="media-masonry-card__fallback" aria-hidden="true">
      {getExtension(media.filename)}
    </span>
  )
}

function MediaViewerPreview({ media }: { media: MediaDoc }) {
  const mediaURL = getFullMediaURL(media)
  const title = getMediaTitle(media)
  const isVideo = media.mimeType?.startsWith('video/')
  const isImage = media.mimeType?.startsWith('image/')

  if (mediaURL && isVideo) {
    return (
      <video
        aria-label={title}
        autoPlay
        className="media-masonry-viewer__asset"
        controls
        playsInline
        src={mediaURL}
      />
    )
  }

  if (mediaURL && isImage) {
    return <img alt={media.alt || title} className="media-masonry-viewer__asset" src={mediaURL} />
  }

  return (
    <div className="media-masonry-viewer__fallback">
      <span>{getExtension(media.filename)}</span>
    </div>
  )
}

function MediaViewerPreviewContent({ media }: { media: MediaDoc }) {
  const mediaURL = getFullMediaURL(media)

  return (
    <>
      <MediaViewerPreview media={media} />
      {mediaURL ? (
        <a
          className="media-masonry-viewer__stage-action"
          href={mediaURL}
          rel="noreferrer"
          target="_blank"
        >
          Open original
        </a>
      ) : null}
    </>
  )
}

function MediaEditField({
  inputMode,
  label,
  multiline,
  onChange,
  value,
}: {
  inputMode?: 'decimal' | 'numeric' | 'text' | 'url'
  label: string
  multiline?: boolean
  onChange: (value: string) => void
  value: string
}) {
  const id = useId()

  return (
    <div className="media-masonry-viewer__field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <div className="media-masonry-viewer__field-control">
          <textarea
            id={id}
            inputMode={inputMode}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            value={value}
          />
        </div>
      ) : (
        <input
          id={id}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      )}
    </div>
  )
}

function MediaReadonlyField({
  action,
  label,
  multiline,
  value,
}: {
  action?: ReactNode
  label: string
  multiline?: boolean
  value?: number | string | null
}) {
  const fieldValue = getDraftValue(value)

  if (!fieldValue) return null

  return (
    <div className="media-masonry-viewer__readonly-field">
      <span className="media-masonry-viewer__readonly-label">{label}</span>
      <div
        className={[
          'media-masonry-viewer__readonly-value',
          multiline ? 'media-masonry-viewer__readonly-value--multiline' : '',
          action ? 'media-masonry-viewer__readonly-value--has-action' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span>{fieldValue}</span>
        {action ? <div className="media-masonry-viewer__readonly-action">{action}</div> : null}
      </div>
    </div>
  )
}

function MediaProperty({ label, value }: { label: string; value?: number | string | null }) {
  if (value === undefined || value === null || value === '') return null

  return (
    <div className="media-masonry-viewer__property">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function MediaMasonryListView(props: ListViewClientProps) {
  const {
    AfterList,
    AfterListTable,
    beforeActions,
    BeforeList,
    BeforeListTable,
    collectionSlug,
    columnState,
    Description,
    disableBulkDelete,
    disableBulkEdit,
    disableQueryPresets,
    enableRowSelections,
    hasCreatePermission: hasCreatePermissionFromProps,
    hasDeletePermission,
    hasTrashPermission,
    listMenuItems,
    newDocumentURL,
    queryPreset,
    queryPresetPermissions,
    renderedFilters,
    resolvedFilterOptions,
    viewType,
  } = props

  const {
    config: {
      routes: { admin: adminRoute, api: apiRoute },
    },
    getEntityConfig,
  } = useConfig()
  const router = useRouter()
  const { data, isGroupingBy, query } = useListQuery()
  const { allowCreate, onBulkSelect } = useListDrawerContext()
  const { drawerSlug: bulkUploadDrawerSlug, setCollectionSlug, setOnSuccess } = useBulkUpload()
  const { openModal } = useModal()
  const { i18n } = useTranslation()
  const { setStepNav } = useStepNav()
  const {
    breakpoints: { s: smallBreak },
  } = useWindowInfo()

  const collectionConfig = getEntityConfig({ collectionSlug })
  const initialMedia = useMemo(() => ((data?.docs || []) as MediaDoc[]).filter(Boolean), [data?.docs])
  const queryKey = useMemo(
    () =>
      JSON.stringify({
        limit: data?.limit || query?.limit,
        search: query?.search,
        sort: query?.sort,
        where: query?.where,
      }),
    [data?.limit, query?.limit, query?.search, query?.sort, query?.where],
  )
  const [media, setMedia] = useState<MediaDoc[]>(initialMedia)
  const [hasNextPage, setHasNextPage] = useState(Boolean(data?.hasNextPage))
  const [nextPage, setNextPage] = useState<number | null>(
    typeof data?.nextPage === 'number' ? data.nextPage : null,
  )
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [selectedMedia, setSelectedMedia] = useState<MediaDoc | null>(null)
  const [mediaDraft, setMediaDraft] = useState<MediaDraft>(emptyMediaDraft)
  const [isSavingMedia, setIsSavingMedia] = useState(false)
  const [isDeletingMedia, setIsDeletingMedia] = useState(false)
  const [copyURLLabel, setCopyURLLabel] = useState('Copy URL')
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isLoadingMoreRef = useRef(false)
  const hasCreatePermission =
    allowCreate !== undefined ? allowCreate && hasCreatePermissionFromProps : hasCreatePermissionFromProps
  const isUploadCollection = Boolean(collectionConfig?.upload)
  const isBulkUploadEnabled = Boolean(
    isUploadCollection &&
      collectionConfig.upload &&
      collectionConfig.upload.bulkUpload &&
      !collectionConfig.upload.hideFileInputOnCreate,
  )
  const isTrashEnabled = Boolean(collectionConfig?.trash)
  const listControlActions =
    enableRowSelections && typeof onBulkSelect === 'function'
      ? beforeActions
        ? [...beforeActions, <SelectMany key="select-many" onClick={onBulkSelect} />]
        : [<SelectMany key="select-many" onClick={onBulkSelect} />]
      : beforeActions
  const hasMediaDraftChanges = useMemo(() => {
    if (!selectedMedia) return false

    try {
      return Object.keys(getMediaUpdatePayload(selectedMedia, mediaDraft)).length > 0
    } catch {
      return true
    }
  }, [mediaDraft, selectedMedia])

  const openBulkUpload = useCallback(() => {
    setCollectionSlug(collectionSlug)
    openModal(bulkUploadDrawerSlug)
    setOnSuccess(() => router.refresh())
  }, [bulkUploadDrawerSlug, collectionSlug, openModal, router, setCollectionSlug, setOnSuccess])

  const openMediaViewer = useCallback((item: MediaDoc) => {
    setSelectedMedia(item)
    setMediaDraft(getMediaDraft(item))
    setCopyURLLabel('Copy URL')
  }, [])

  const closeMediaViewer = useCallback(() => {
    setSelectedMedia(null)
    setMediaDraft(emptyMediaDraft)
    setIsSavingMedia(false)
    setIsDeletingMedia(false)
    setCopyURLLabel('Copy URL')
  }, [])

  const updateMediaDraft = useCallback((key: keyof MediaDraft, value: string) => {
    setMediaDraft((currentDraft) => ({ ...currentDraft, [key]: value }))
  }, [])

  const copySelectedMediaURL = useCallback(async () => {
    const mediaURL = selectedMedia ? getFullMediaURL(selectedMedia) : null

    if (!mediaURL || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(mediaURL)
      setCopyURLLabel('Copied')
      window.setTimeout(() => setCopyURLLabel('Copy URL'), 1400)
    } catch {
      setCopyURLLabel('Could not copy')
      window.setTimeout(() => setCopyURLLabel('Copy URL'), 1800)
    }
  }, [selectedMedia])

  const saveSelectedMedia = useCallback(async () => {
    if (!selectedMedia || isSavingMedia) return

    let updatePayload: Partial<MediaDoc>

    try {
      updatePayload = getMediaUpdatePayload(selectedMedia, mediaDraft)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Media update failed')
      return
    }

    if (Object.keys(updatePayload).length === 0) return

    setIsSavingMedia(true)

    try {
      const apiPath = formatAdminURL({ adminRoute: apiRoute, path: `/${collectionSlug}/${selectedMedia.id}` })
      const response = await fetch(apiPath, {
        body: JSON.stringify(updatePayload),
        credentials: 'same-origin',
        headers: {
          'Accept-Language': i18n.language,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error(await getResponseMessage(response, `Media update failed with ${response.status}`))
      }

      const updatedMedia = (await response.json()) as MediaDoc

      setMedia((currentDocs) =>
        currentDocs.map((item) => (getMediaID(item) === getMediaID(updatedMedia) ? updatedMedia : item)),
      )
      setSelectedMedia(updatedMedia)
      setMediaDraft(getMediaDraft(updatedMedia))
      toast.success('Media updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Media update failed')
    } finally {
      setIsSavingMedia(false)
    }
  }, [adminRoute, apiRoute, collectionSlug, i18n.language, isSavingMedia, mediaDraft, selectedMedia])

  const deleteSelectedMedia = useCallback(async () => {
    if (!selectedMedia || isDeletingMedia) return

    const title = getMediaTitle(selectedMedia)
    const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`)

    if (!confirmed) return

    setIsDeletingMedia(true)

    try {
      const apiPath = formatAdminURL({ adminRoute: apiRoute, path: `/${collectionSlug}/${selectedMedia.id}` })
      const response = await fetch(apiPath, {
        credentials: 'same-origin',
        headers: { 'Accept-Language': i18n.language },
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await getResponseMessage(response, `Media delete failed with ${response.status}`))
      }

      const deletedID = getMediaID(selectedMedia)

      setMedia((currentDocs) => currentDocs.filter((item) => getMediaID(item) !== deletedID))
      closeMediaViewer()
      toast.success('Media deleted')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Media delete failed')
      setIsDeletingMedia(false)
    }
  }, [
    adminRoute,
    apiRoute,
    closeMediaViewer,
    collectionSlug,
    i18n.language,
    isDeletingMedia,
    router,
    selectedMedia,
  ])

  useEffect(() => {
    setMedia(initialMedia)
    setHasNextPage(Boolean(data?.hasNextPage))
    setNextPage(typeof data?.nextPage === 'number' ? data.nextPage : null)
    setLoadMoreError(null)
    setIsLoadingMore(false)
    isLoadingMoreRef.current = false
  }, [data?.hasNextPage, data?.nextPage, initialMedia, queryKey])

  useEffect(() => {
    if (!selectedMedia) return

    const selectedID = getMediaID(selectedMedia)
    const nextSelectedMedia = media.find((item) => getMediaID(item) === selectedID)

    if (nextSelectedMedia) {
      setSelectedMedia(nextSelectedMedia)
      return
    }

    closeMediaViewer()
  }, [closeMediaViewer, media, selectedMedia])

  useEffect(() => {
    if (!selectedMedia) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMediaViewer()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMediaViewer, selectedMedia])

  const loadMoreMedia = useCallback(async () => {
    if (isGroupingBy || isLoadingMoreRef.current || !hasNextPage || !nextPage) return

    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    setLoadMoreError(null)

    try {
      const limit = Number(data?.limit || query?.limit || 100)
      const apiPath = formatAdminURL({ adminRoute: apiRoute, path: `/${collectionSlug}` })
      const queryString = getLazyLoadQueryString({
        limit,
        page: nextPage,
        query: query as Record<string, unknown> | undefined,
      })
      const response = await fetch(`${apiPath}${queryString}`, {
        credentials: 'same-origin',
        headers: { 'Accept-Language': i18n.language },
      })

      if (!response.ok) {
        throw new Error(`Media lazy load failed with ${response.status}`)
      }

      const nextData = (await response.json()) as MediaAPIResponse
      const nextDocs = (nextData.docs || []).filter(Boolean)

      setMedia((currentDocs) => mergeMediaDocs(currentDocs, nextDocs))
      setHasNextPage(Boolean(nextData.hasNextPage))
      setNextPage(typeof nextData.nextPage === 'number' ? nextData.nextPage : null)
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : 'Media lazy load failed')
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [
    adminRoute,
    apiRoute,
    collectionSlug,
    data?.limit,
    hasNextPage,
    i18n.language,
    isGroupingBy,
    nextPage,
    query,
  ])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasNextPage || isGroupingBy) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMoreMedia()
      },
      { rootMargin: '720px 0px 720px' },
    )

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [hasNextPage, isGroupingBy, loadMoreMedia])

  useEffect(() => {
    const baseLabel = {
      label: getTranslation(collectionConfig?.labels?.plural, i18n),
      url:
        isTrashEnabled && viewType === 'trash'
          ? formatAdminURL({ adminRoute, path: `/collections/${collectionSlug}` })
          : undefined,
    }
    const navItems =
      isTrashEnabled && viewType === 'trash'
        ? [baseLabel, { label: i18n.t('general:trash') }]
        : [baseLabel]

    setStepNav(navItems)
  }, [adminRoute, collectionConfig?.labels?.plural, collectionSlug, i18n, isTrashEnabled, setStepNav, viewType])

  return (
    <TableColumnsProvider collectionSlug={collectionSlug} columnState={columnState}>
      <div className="collection-list collection-list--media-masonry">
        <SelectionProvider docs={media} totalDocs={data?.totalDocs || 0}>
          {BeforeList}

          <Gutter className="collection-list__wrap media-masonry-list-view">
            <ListHeader
              collectionConfig={collectionConfig}
              Description={Description}
              disableBulkDelete={disableBulkDelete}
              disableBulkEdit={disableBulkEdit}
              hasCreatePermission={hasCreatePermission}
              hasDeletePermission={hasDeletePermission}
              hasTrashPermission={hasTrashPermission}
              i18n={i18n}
              isBulkUploadEnabled={isBulkUploadEnabled}
              isTrashEnabled={isTrashEnabled}
              newDocumentURL={newDocumentURL}
              openBulkUpload={openBulkUpload}
              smallBreak={smallBreak}
              viewType={viewType}
            />

            <ListControls
              beforeActions={listControlActions}
              collectionConfig={collectionConfig}
              collectionSlug={collectionSlug}
              disableQueryPresets={collectionConfig?.enableQueryPresets !== true || disableQueryPresets}
              enableColumns={false}
              listMenuItems={listMenuItems}
              queryPreset={queryPreset}
              queryPresetPermissions={queryPresetPermissions}
              renderedFilters={renderedFilters}
              resolvedFilterOptions={resolvedFilterOptions}
            />

            {BeforeListTable}

            {media.length > 0 ? (
              <div className="media-masonry-grid" aria-label="Media">
                {media.map((item) => {
                  const title = getMediaTitle(item)

                  return (
                    <button
                      aria-label={`Preview ${title}`}
                      className="media-masonry-card"
                      key={item.id}
                      onClick={() => openMediaViewer(item)}
                      type="button"
                    >
                      <span className="media-masonry-card__preview" style={getPreviewStyle(item)}>
                        <MediaPreview media={item} />
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="media-masonry-empty">
                <h3>No media found</h3>
                <p>Upload a file or adjust the current filters.</p>
              </div>
            )}

            {AfterListTable}

            {media.length > 0 && !isGroupingBy ? (
              <div className="media-masonry-load-more" ref={loadMoreRef} aria-live="polite">
                {isLoadingMore ? <span>Loading more media...</span> : null}
                {loadMoreError ? (
                  <button className="media-masonry-load-more__button" type="button" onClick={loadMoreMedia}>
                    Retry loading media
                  </button>
                ) : null}
                {!hasNextPage && !isLoadingMore && !loadMoreError ? (
                  <span>{`Showing all ${media.length} media items`}</span>
                ) : null}
              </div>
            ) : null}
          </Gutter>

          {selectedMedia ? (
            <div
              aria-labelledby="media-masonry-viewer-title"
              aria-modal="true"
              className="media-masonry-viewer"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeMediaViewer()
              }}
              role="dialog"
            >
              {!smallBreak ? (
                <div className="media-masonry-viewer__stage">
                  <MediaViewerPreviewContent media={selectedMedia} />
                </div>
              ) : null}
              <aside className="media-masonry-viewer__sheet">
                <div className="media-masonry-viewer__sheet-header">
                  <div>
                    <h2 id="media-masonry-viewer-title">Media details</h2>
                  </div>
                  <button
                    aria-label="Close preview"
                    className="media-masonry-viewer__icon-button"
                    onClick={closeMediaViewer}
                    type="button"
                  >
                    <AdminHugeIcon icon={Cancel01Icon} />
                  </button>
                </div>

                {smallBreak ? (
                  <div className="media-masonry-viewer__sheet-preview">
                    <MediaViewerPreviewContent media={selectedMedia} />
                  </div>
                ) : null}

                <div className="media-masonry-viewer__sheet-body">
                  <form
                    className="media-masonry-viewer__edit"
                    id="media-masonry-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void saveSelectedMedia()
                    }}
                  >
                    <MediaEditField
                      label="Alt"
                      multiline
                      onChange={(value) => updateMediaDraft('alt', value)}
                      value={mediaDraft.alt}
                    />
                  </form>

                  <div className="media-masonry-viewer__readonly-fields">
                    <MediaReadonlyField label="Filename" value={selectedMedia.filename} />
                    <div className="media-masonry-viewer__field-row">
                      <MediaReadonlyField label="Width" value={selectedMedia.width} />
                      <MediaReadonlyField label="Height" value={selectedMedia.height} />
                    </div>
                    <MediaReadonlyField label="File size" value={selectedMedia.filesize} />
                    <MediaReadonlyField
                      label="MIME type"
                      value={selectedMedia.mimeType}
                    />
                    <MediaReadonlyField
                      action={
                        <button
                          aria-label={copyURLLabel}
                          className="media-masonry-viewer__field-action-button"
                          disabled={!getFullMediaURL(selectedMedia)}
                          onClick={copySelectedMediaURL}
                          title={copyURLLabel}
                          type="button"
                        >
                          <AdminHugeIcon icon={Copy01Icon} />
                        </button>
                      }
                      label="URL"
                      multiline
                      value={getFullMediaURL(selectedMedia)}
                    />
                  </div>

                  <dl className="media-masonry-viewer__properties">
                    <MediaProperty label="ID" value={selectedMedia.id} />
                    <MediaProperty
                      label="Created"
                      value={formatMediaDate(selectedMedia.createdAt, i18n.language)}
                    />
                    <MediaProperty
                      label="Updated"
                      value={formatMediaDate(selectedMedia.updatedAt, i18n.language)}
                    />
                  </dl>
                </div>

                <footer className="media-masonry-viewer__footer">
                  {hasDeletePermission ? (
                    <button
                      aria-label={isDeletingMedia ? 'Deleting media' : 'Delete media'}
                      className="media-masonry-viewer__footer-delete"
                      disabled={isDeletingMedia || isSavingMedia}
                      onClick={() => {
                        void deleteSelectedMedia()
                      }}
                      title={isDeletingMedia ? 'Deleting media' : 'Delete media'}
                      type="button"
                    >
                      <AdminHugeIcon icon={Delete02Icon} />
                    </button>
                  ) : null}
                  <div className="media-masonry-viewer__footer-actions">
                    <button
                      className="media-masonry-viewer__cancel"
                      disabled={isSavingMedia || isDeletingMedia}
                      onClick={closeMediaViewer}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="media-masonry-viewer__save"
                      disabled={isSavingMedia || !hasMediaDraftChanges}
                      form="media-masonry-edit-form"
                      type="submit"
                    >
                      {isSavingMedia ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </footer>
              </aside>
            </div>
          ) : null}

          {AfterList}
        </SelectionProvider>
      </div>
    </TableColumnsProvider>
  )
}

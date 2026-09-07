'use client'

import {
  DragHandleIcon,
  DraggableSortable,
  DraggableSortableItem,
  Link,
  toast,
  useAuth,
  useConfig,
  useListQuery,
  useStepNav,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'

import { getPagePath, sortPagesByOrder } from '@/lib/pageOrdering'

type NavPage = {
  id: number | string
  order?: number | string | null
  slug?: string | null
  title?: string | null
}

type NavPagesListViewProps = {
  BeforeList?: ReactNode
  BeforeListTable?: ReactNode
}

export function NavPagesListView({ BeforeList, BeforeListTable }: NavPagesListViewProps) {
  const {
    config: {
      routes: { admin: adminRoute, api: apiRoute },
    },
  } = useConfig()
  const { permissions } = useAuth()
  const { data } = useListQuery()
  const { setStepNav } = useStepNav()
  const queriedPages = useMemo(
    () => sortPagesByOrder(((data?.docs || []) as NavPage[]).filter(Boolean)),
    [data?.docs],
  )
  const [pages, setPages] = useState(queriedPages)
  const [savingOrder, setSavingOrder] = useState(false)
  const canUpdatePages = Boolean(permissions?.collections?.pages?.update)

  useEffect(() => {
    setPages(queriedPages)
  }, [queriedPages])

  useEffect(() => {
    setStepNav([{ label: 'Nav' }])
  }, [setStepNav])

  const savePageOrder = useCallback(async (orderedPages: NavPage[]) => {
    const responses = await Promise.all(
      orderedPages.map((page, index) => {
        const apiPath = formatAdminURL({
          adminRoute: apiRoute,
          path: `/pages/${page.id}`,
        })

        return fetch(apiPath, {
          body: JSON.stringify({ order: index }),
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
      }),
    )

    if (responses.some((response) => !response.ok)) {
      throw new Error('Could not save the navigation order')
    }
  }, [apiRoute])

  const handleReorder = useCallback(async ({
    moveFromIndex,
    moveToIndex,
  }: {
    moveFromIndex: number
    moveToIndex: number
  }) => {
    if (savingOrder || moveFromIndex < 0 || moveToIndex < 0 || moveFromIndex === moveToIndex) return

    const previousPages = pages
    const reorderedPages = [...pages]
    const [movedPage] = reorderedPages.splice(moveFromIndex, 1)
    reorderedPages.splice(moveToIndex, 0, movedPage)
    setPages(reorderedPages)
    setSavingOrder(true)

    try {
      await savePageOrder(reorderedPages)
      toast.success('Navigation order updated')
    } catch (error) {
      setPages(previousPages)
      toast.error(error instanceof Error ? error.message : 'Could not save the navigation order')
    } finally {
      setSavingOrder(false)
    }
  }, [pages, savePageOrder, savingOrder])

  const pageIDs = pages.map((page) => String(page.id))

  const renderPageLink = (page: NavPage) => {
    const label = page.title || page.slug || 'Untitled page'
    const href = formatAdminURL({
      adminRoute,
      path: `/collections/pages/${page.id}`,
    })

    return (
      <Link
        aria-label={`Edit ${label}`}
        className="nav-pages-list-view__link"
        href={href}
        prefetch={false}
      >
        <span className="nav-pages-list-view__label">{label}</span>
        <span className="nav-pages-list-view__path">{getPagePath(page.slug) || 'No path'}</span>
        <span className="nav-pages-list-view__chevron" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <div className="collection-list collection-list--nav-pages">
      {BeforeList}
      <main className="nav-pages-list-view">
        {BeforeListTable}
        <div className="nav-pages-list-view__list" aria-busy={savingOrder} aria-label="Editable pages" role="list">
          <DraggableSortable className="nav-pages-list-view__sortable" ids={pageIDs} onDragEnd={handleReorder}>
            {pages.map((page) => (
              <DraggableSortableItem disabled={!canUpdatePages || savingOrder} id={String(page.id)} key={page.id}>
                {({ attributes, isDragging, listeners, setNodeRef, transform, transition }) => (
                  <div
                    className={`nav-pages-list-view__item${isDragging ? ' nav-pages-list-view__item--dragging' : ''}`}
                    ref={setNodeRef}
                    role="listitem"
                    style={{ transform, transition } as CSSProperties}
                  >
                    <button
                      {...attributes}
                      {...listeners}
                      aria-label={`Reorder ${page.title || page.slug || 'page'}`}
                      className="nav-pages-list-view__drag-handle"
                      disabled={!canUpdatePages || savingOrder}
                      type="button"
                    >
                      <DragHandleIcon />
                    </button>
                    {renderPageLink(page)}
                  </div>
                )}
              </DraggableSortableItem>
            ))}
          </DraggableSortable>

        </div>
      </main>
    </div>
  )
}

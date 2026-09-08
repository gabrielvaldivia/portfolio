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
import { orderSiteNavigationItems } from '@/lib/siteNavigation'

type NavPage = {
  id: number | string
  order?: number | string | null
  slug?: string | null
  title?: string | null
}

type NavListItem = (NavPage & {
  label: string
  url: string
}) | {
  kind: 'notes'
  label: string
  url: '/notes'
}

type NavPagesListViewProps = {
  BeforeList?: ReactNode
  BeforeListTable?: ReactNode
}

const notesSortableID = 'nav-notes'

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
  const canUpdatePages = Boolean(permissions?.collections?.pages?.update)
  const canCreatePages = Boolean(permissions?.collections?.pages?.create)
  const canReadNotes = Boolean(permissions?.collections?.notes?.read)
  const queriedNavigationItems = useMemo(
    () => orderSiteNavigationItems(queriedPages.map((page) => ({
      ...page,
      label: page.title || page.slug || 'Untitled page',
      url: getPagePath(page.slug) || '',
    }))).filter((item) => item.url !== '/notes' || canReadNotes) as NavListItem[],
    [canReadNotes, queriedPages],
  )
  const [navigationItems, setNavigationItems] = useState(queriedNavigationItems)
  const [savingOrder, setSavingOrder] = useState(false)

  useEffect(() => {
    setNavigationItems(queriedNavigationItems)
  }, [queriedNavigationItems])

  useEffect(() => {
    setStepNav([{ label: 'Nav' }])
  }, [setStepNav])

  const saveNavigationOrder = useCallback(async (orderedItems: NavListItem[]) => {
    let persistedItems = orderedItems
    const unpersistedNotesIndex = persistedItems.findIndex(
      (item) => item.url === '/notes' && !('id' in item),
    )

    if (unpersistedNotesIndex >= 0) {
      const response = await fetch(formatAdminURL({ adminRoute: apiRoute, path: '/pages' }), {
        body: JSON.stringify({
          order: unpersistedNotesIndex,
          slug: 'notes',
          status: 'published',
          title: 'Notes',
          type: 'custom',
        }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) throw new Error('Could not make Notes reorderable')

      const result = await response.json() as { doc?: NavPage }
      const createdNotesPage = result.doc ?? (result as NavPage)
      if (!createdNotesPage?.id) throw new Error('Could not make Notes reorderable')

      const persistedNotes: NavListItem = {
        ...createdNotesPage,
        label: createdNotesPage.title || 'Notes',
        url: '/notes',
      }
      persistedItems = orderedItems.map((item, index) => (
        index === unpersistedNotesIndex ? persistedNotes : item
      ))
    }

    const orderedPages = persistedItems.flatMap((item, index) => (
      'id' in item ? [{ ...item, order: index }] : []
    ))
    const responses = await Promise.all(
      orderedPages.map((page) => {
        const apiPath = formatAdminURL({
          adminRoute: apiRoute,
          path: `/pages/${page.id}`,
        })

        return fetch(apiPath, {
          body: JSON.stringify({ order: page.order }),
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        })
      }),
    )

    if (responses.some((response) => !response.ok)) {
      throw new Error('Could not save the navigation order')
    }

    return persistedItems.map((item, index) => (
      'id' in item ? { ...item, order: index } : item
    ))
  }, [apiRoute])

  const handleReorder = useCallback(async ({
    moveFromIndex,
    moveToIndex,
  }: {
    moveFromIndex: number
    moveToIndex: number
  }) => {
    if (savingOrder || moveFromIndex < 0 || moveToIndex < 0 || moveFromIndex === moveToIndex) return

    const previousItems = navigationItems
    const reorderedItems = [...navigationItems]
    const [movedItem] = reorderedItems.splice(moveFromIndex, 1)
    reorderedItems.splice(moveToIndex, 0, movedItem)
    setNavigationItems(reorderedItems)
    setSavingOrder(true)

    try {
      const persistedItems = await saveNavigationOrder(reorderedItems)
      setNavigationItems(persistedItems)
      toast.success('Navigation order updated')
    } catch (error) {
      setNavigationItems(previousItems)
      toast.error(error instanceof Error ? error.message : 'Could not save the navigation order')
    } finally {
      setSavingOrder(false)
    }
  }, [navigationItems, saveNavigationOrder, savingOrder])

  const navigationIDs = navigationItems.map((item) => (
    'id' in item ? String(item.id) : notesSortableID
  ))
  const hasUnpersistedNotes = navigationItems.some(
    (item) => item.url === '/notes' && !('id' in item),
  )
  const canReorderNavigation = canUpdatePages && (!hasUnpersistedNotes || canCreatePages)

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
          <DraggableSortable className="nav-pages-list-view__sortable" ids={navigationIDs} onDragEnd={handleReorder}>
            {navigationItems.map((item) => {
              const isNotes = item.url === '/notes'
              const sortableID = 'id' in item ? String(item.id) : notesSortableID

              return (
                <DraggableSortableItem disabled={!canReorderNavigation || savingOrder} id={sortableID} key={sortableID}>
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
                        aria-label={`Reorder ${item.label}`}
                        className="nav-pages-list-view__drag-handle"
                        disabled={!canReorderNavigation || savingOrder}
                        type="button"
                      >
                        <DragHandleIcon />
                      </button>
                      {isNotes ? (
                        <Link
                          aria-label="Edit Notes"
                          className="nav-pages-list-view__link"
                          href={formatAdminURL({ adminRoute, path: '/collections/notes' })}
                          prefetch={false}
                        >
                          <span className="nav-pages-list-view__label">{item.label}</span>
                          <span className="nav-pages-list-view__path">{item.url}</span>
                          <span className="nav-pages-list-view__chevron" aria-hidden="true" />
                        </Link>
                      ) : 'id' in item ? renderPageLink(item) : null}
                    </div>
                  )}
                </DraggableSortableItem>
              )
            })}
          </DraggableSortable>

        </div>
      </main>
    </div>
  )
}

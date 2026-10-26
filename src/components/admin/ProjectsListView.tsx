'use client'

import {
  Button,
  DragHandleIcon,
  DraggableSortable,
  DraggableSortableItem,
  Link,
  toast,
  useAuth,
  useConfig,
  useListQuery,
  useStepNav,
  useTranslation,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import type { ListViewClientProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'

type ProjectListItem = {
  hide?: boolean | null
  id: number | string
  order?: number | null
  slug?: string | null
  title?: string | null
}

function getOrder(project: ProjectListItem) {
  return typeof project.order === 'number' && Number.isFinite(project.order)
    ? project.order
    : Number.POSITIVE_INFINITY
}

export function ProjectsListView({
  BeforeList,
  BeforeListTable,
  hasCreatePermission,
  newDocumentURL,
}: ListViewClientProps) {
  const {
    config: {
      routes: { admin: adminRoute, api: apiRoute },
    },
  } = useConfig()
  const { t } = useTranslation()
  const { permissions } = useAuth()
  const { data, handleSortChange, query } = useListQuery()
  const { setStepNav } = useStepNav()
  const router = useRouter()
  const canUpdateProjects = Boolean(permissions?.collections?.projects?.update)

  // The site sorts by `order` and breaks ties by newest first; the stable sort keeps that tie order.
  const queriedProjects = useMemo(
    () => [...((data?.docs || []) as ProjectListItem[]).filter(Boolean)].sort((a, b) => getOrder(a) - getOrder(b)),
    [data?.docs],
  )
  const [projects, setProjects] = useState(queriedProjects)
  const [savingOrder, setSavingOrder] = useState(false)

  useEffect(() => {
    setProjects(queriedProjects)
  }, [queriedProjects])

  useEffect(() => {
    setStepNav([{ label: 'Projects' }])
  }, [setStepNav])

  // A sort saved from the old table view would otherwise override the site order.
  useEffect(() => {
    if (query?.sort && query.sort !== 'order') void handleSortChange?.('order')
  }, [handleSortChange, query?.sort])

  const saveProjectOrder = useCallback(async (orderedProjects: ProjectListItem[]) => {
    // Only projects that moved need saving; each save also refreshes the site cache.
    const movedProjects = orderedProjects.flatMap((project, index) => (
      project.order === index ? [] : [{ ...project, order: index }]
    ))

    // Save one at a time: parallel updates can exhaust the small database pool and stall.
    for (const project of movedProjects) {
      const response = await fetch(
        formatAdminURL({ adminRoute: apiRoute, path: `/projects/${project.id}` }),
        {
          body: JSON.stringify({ order: project.order }),
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          method: 'PATCH',
        },
      )
      if (!response.ok) throw new Error('Could not save the project order')
    }

    return orderedProjects.map((project, index) => ({ ...project, order: index }))
  }, [apiRoute])

  const handleReorder = useCallback(async ({
    moveFromIndex,
    moveToIndex,
  }: {
    moveFromIndex: number
    moveToIndex: number
  }) => {
    if (savingOrder || moveFromIndex < 0 || moveToIndex < 0 || moveFromIndex === moveToIndex) return

    const previousProjects = projects
    const reorderedProjects = [...projects]
    const [movedProject] = reorderedProjects.splice(moveFromIndex, 1)
    reorderedProjects.splice(moveToIndex, 0, movedProject)
    setProjects(reorderedProjects)
    setSavingOrder(true)

    try {
      setProjects(await saveProjectOrder(reorderedProjects))
      toast.success('Project order updated')
    } catch (error) {
      setProjects(previousProjects)
      // Some projects may have saved before the failure; show what the server has.
      router.refresh()
      toast.error(error instanceof Error ? error.message : 'Could not save the project order')
    } finally {
      setSavingOrder(false)
    }
  }, [projects, router, saveProjectOrder, savingOrder])

  const dragDisabled = !canUpdateProjects || savingOrder

  return (
    <div className="collection-list collection-list--nav-pages collection-list--projects">
      {BeforeList}
      <main className="nav-pages-list-view">
        {hasCreatePermission && (
          // Reuses the list header slot that the admin styles pin to the top bar.
          <header className="list-header">
            <div className="list-header__title-actions">
              <Button
                buttonStyle="pill"
                className="list-create-new-doc__create-new-button"
                el="link"
                size="small"
                to={newDocumentURL}
              >
                {t('general:createNew')}
              </Button>
            </div>
          </header>
        )}
        {BeforeListTable}
        <div className="nav-pages-list-view__list" aria-busy={savingOrder} aria-label="Projects" role="list">
          <DraggableSortable
            className="nav-pages-list-view__sortable"
            ids={projects.map((project) => String(project.id))}
            onDragEnd={handleReorder}
          >
            {projects.map((project) => {
              const label = project.title || project.slug || 'Untitled project'
              const path = project.slug ? `/work/${project.slug}` : 'No path'

              return (
                <DraggableSortableItem disabled={dragDisabled} id={String(project.id)} key={project.id}>
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
                        aria-label={`Reorder ${label}`}
                        className="nav-pages-list-view__drag-handle"
                        disabled={dragDisabled}
                        type="button"
                      >
                        <DragHandleIcon />
                      </button>
                      <Link
                        aria-label={`Edit ${label}`}
                        className="nav-pages-list-view__link"
                        href={formatAdminURL({ adminRoute, path: `/collections/projects/${project.id}` })}
                        prefetch={false}
                      >
                        <span className="nav-pages-list-view__label">{label}</span>
                        <span className="nav-pages-list-view__path">{project.hide ? `Hidden · ${path}` : path}</span>
                        <span className="nav-pages-list-view__chevron" aria-hidden="true" />
                      </Link>
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

'use client'

import { FormSubmit, PopupList, useConfig, useDocumentInfo, useField, useForm } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

type NoteEditorView = 'writing' | 'metadata' | 'highlights'
const views: NoteEditorView[] = ['writing', 'metadata', 'highlights']

const TAB_SELECTOR = '.notes-editor-tabs .tabs-field__tab-button'

export function NotesPublishButton() {
  const { value: publishDate } = useField<string>({ path: 'publishedAt' })
  const { id, data, hasPublishPermission, uploadStatus, setHasPublishedDoc,
    setMostRecentVersionIsAutosaved, setUnpublishedVersionCount } = useDocumentInfo()
  const { config: { routes: { api } } } = useConfig()
  const { submit } = useForm()
  const future = Boolean(publishDate && new Date(publishDate).getTime() > Date.now())
  const schedule = typeof data?.scheduledFor === 'string' ? data.scheduledFor : null
  if (!hasPublishPermission) return null

  const publish = async () => {
    const result = await submit({
      action: `${api}/notes${id ? `/${id}` : ''}?depth=0`,
      method: id ? 'PATCH' : 'POST',
      overrides: { _status: 'published' },
      disableSuccessStatus: true,
    })
    if (!result?.res.ok) return
    const published = result.formState?._status?.value === 'published'
    setHasPublishedDoc(published)
    setMostRecentVersionIsAutosaved(false)
    setUnpublishedVersionCount(0)
    toast.success(published ? 'Note published' : 'Note scheduled')
  }

  return <div className="notes-publish-controls">
    {schedule && <span className="notes-schedule-status" role="status">
      Scheduled for {new Date(schedule).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      })}
    </span>}
    <FormSubmit buttonId="action-save" type="button" size="medium"
      disabled={uploadStatus === 'uploading'} onClick={publish}>
      {future ? (schedule ? 'Update schedule' : 'Schedule') : 'Publish'}
    </FormSubmit>
  </div>
}

function getActiveView(): NoteEditorView {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR))
  const activeIndex = tabs.findIndex((tab) => tab.classList.contains('tabs-field__tab-button--active'))

  return views[activeIndex] || 'writing'
}

export function NotesEditMenu() {
  const { collectionSlug, id, data } = useDocumentInfo()
  const { config: { routes: { api } } } = useConfig()
  const { submit } = useForm()
  const cancelSchedule = async () => {
    // Save any current edits before removing the schedule.
    const saved = await submit({ overrides: { _status: 'draft' }, action: `${api}/notes/${id}?draft=true`,
      method: 'PATCH', skipValidation: true, disableSuccessStatus: true })
    if (!saved?.res.ok) return
    const response = await fetch(`${api}/notes/${id}/cancel-schedule`, { method: 'POST', credentials: 'same-origin' })
    if (!response.ok) { toast.error('Could not cancel the schedule'); return }
    window.location.reload()
  }
  const [activeView, setActiveView] = useState<NoteEditorView>('writing')

  useEffect(() => {
    if (collectionSlug !== 'notes') return

    const syncActiveView = () => setActiveView(getActiveView())
    let tabsObserver: MutationObserver | undefined

    const observeTabs = () => {
      const tabs = document.querySelector('.notes-editor-tabs')
      if (!tabs) return false

      syncActiveView()
      tabsObserver = new MutationObserver(syncActiveView)
      tabsObserver.observe(tabs, {
        attributes: true,
        attributeFilter: ['class'],
        subtree: true,
      })

      return true
    }

    if (observeTabs()) {
      return () => tabsObserver?.disconnect()
    }

    const mountObserver = new MutationObserver(() => {
      if (observeTabs()) {
        mountObserver.disconnect()
      }
    })

    mountObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      mountObserver.disconnect()
      tabsObserver?.disconnect()
    }
  }, [collectionSlug])

  const selectView = useCallback((view: NoteEditorView) => {
    const index = views.indexOf(view)
    const tabs = document.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR)

    tabs[index]?.click()
    setActiveView(view)
  }, [])

  if (collectionSlug !== 'notes') {
    return null
  }

  return (
    <>
      <p className="popup-list-group-label notes-edit-menu-editor-label">Editor</p>
      <PopupList.Button
        active={activeView === 'writing'}
        id="notes-edit-menu-writing"
        onClick={() => selectView('writing')}
      >
        Writing
      </PopupList.Button>
      <PopupList.Button
        active={activeView === 'metadata'}
        id="notes-edit-menu-metadata"
        onClick={() => selectView('metadata')}
      >
        Metadata
      </PopupList.Button>
      <PopupList.Button
        active={activeView === 'highlights'}
        id="notes-edit-menu-highlights"
        onClick={() => selectView('highlights')}
      >
        Highlights
      </PopupList.Button>
      <hr className="popup-divider notes-edit-menu-divider" />
      <p className="popup-list-group-label notes-edit-menu-actions-label">Actions</p>
      {data?.scheduledFor && <PopupList.Button id="notes-cancel-schedule" onClick={cancelSchedule}>
        Cancel schedule
      </PopupList.Button>}
    </>
  )
}

'use client'

import { FormSubmit, PopupList, toast, useConfig, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type NoteEditorView = 'writing' | 'metadata' | 'highlights'
const views: NoteEditorView[] = ['writing', 'metadata', 'highlights']

const TAB_SELECTOR = '.notes-editor-tabs .tabs-field__tab-button'

export function NotesPublishButton() {
  const publishDate = useFormFields(([fields]) => fields.publishedAt?.value) as string | undefined
  const { id, data, hasPublishedDoc, hasPublishPermission, uploadStatus, setHasPublishedDoc,
    setMostRecentVersionIsAutosaved, setUnpublishedVersionCount } = useDocumentInfo()
  const { config: { routes: { api } } } = useConfig()
  const { submit } = useForm()
  const [pickerRequest, setPickerRequest] = useState(0)
  const hasBeenPublished = Boolean(hasPublishedDoc || data?.firstPublishedAt)
  const future = Boolean(publishDate && new Date(publishDate).getTime() > Date.now())
  const schedule = typeof data?.scheduledFor === 'string' ? data.scheduledFor : null
  const scheduleChanged = Boolean(schedule && new Date(publishDate || '').getTime() !== new Date(schedule).getTime())

  useEffect(() => {
    if (!pickerRequest) return

    // Metadata mounts on demand, and its date picker loads asynchronously.
    const observer = new MutationObserver(focusDate)
    function focusDate() {
      const input = document.querySelector<HTMLInputElement>('#field-publishedAt input')
      if (!input || !input.getClientRects().length) return
      observer.disconnect()
      input.scrollIntoView({ block: 'center' })
      input.focus({ preventScroll: true })
      input.click()
    }
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] })
    document.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR)[views.indexOf('metadata')]?.click()
    const frame = requestAnimationFrame(focusDate)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [pickerRequest])

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
    toast.success(published ? (hasBeenPublished ? 'Changes published' : 'Note published') : schedule ? 'Schedule updated' : 'Note scheduled')
  }

  return (
    <FormSubmit buttonId="action-save" type="button" size="medium"
      disabled={uploadStatus === 'uploading'}
      onClick={schedule && future && !scheduleChanged ? () => setPickerRequest((request) => request + 1) : publish}>
      {future ? (schedule ? (scheduleChanged ? 'Save schedule' : 'Update schedule') : 'Schedule') : hasBeenPublished ? 'Publish changes' : 'Publish'}
    </FormSubmit>
  )
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
      {data?.scheduledFor && <PopupList.Button id="notes-cancel-schedule" onClick={cancelSchedule}>
        Cancel schedule
      </PopupList.Button>}
    </>
  )
}

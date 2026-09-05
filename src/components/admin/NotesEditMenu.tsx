'use client'

import { PopupList, useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type NoteEditorView = 'writing' | 'metadata'

const TAB_SELECTOR = '.notes-editor-tabs .tabs-field__tab-button'

function getActiveView(): NoteEditorView {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR))
  const activeIndex = tabs.findIndex((tab) => tab.classList.contains('tabs-field__tab-button--active'))

  return activeIndex === 1 ? 'metadata' : 'writing'
}

export function NotesEditMenu() {
  const { collectionSlug } = useDocumentInfo()
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
    const index = view === 'writing' ? 0 : 1
    const tabs = document.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR)

    tabs[index]?.click()
    setActiveView(view)
  }, [])

  if (collectionSlug !== 'notes') {
    return null
  }

  return (
    <>
      <PopupList.Divider />
      <PopupList.GroupLabel label="Editor" />
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
    </>
  )
}

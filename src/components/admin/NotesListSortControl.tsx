'use client'

import { ChevronIcon, Popup, PopupList, useListQuery } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const sortOptions = [
  { label: 'Newest published', value: '-publishedAt' },
  { label: 'Oldest published', value: 'publishedAt' },
  { label: 'Recently updated', value: '-updatedAt' },
  { label: 'Least recently updated', value: 'updatedAt' },
  { label: 'Title A–Z', value: 'title' },
  { label: 'Title Z–A', value: '-title' },
] as const

export function NotesListSortControl() {
  const { query, refineListData } = useListQuery()
  const [actionsContainer, setActionsContainer] = useState<HTMLElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setActionsContainer(
      document.querySelector<HTMLElement>(
        '.collection-list--notes .list-controls .search-bar__actions',
      ),
    )
  }, [])

  if (!actionsContainer) return null

  const querySort = Array.isArray(query.sort) ? query.sort[0] : query.sort
  const activeSort = querySort || '-publishedAt'

  return createPortal(
    <Popup
      button={
        <span className="notes-list-sort-control__button-content">
          <span>Sort</span>
          <ChevronIcon direction={isOpen ? 'up' : 'down'} />
        </span>
      }
      buttonClassName="notes-list-sort-control__trigger"
      caret={false}
      className="notes-list-sort-control"
      horizontalAlign="right"
      id="notes-list-sort"
      noBackground
      onToggleClose={() => setIsOpen(false)}
      onToggleOpen={() => setIsOpen(true)}
      portalClassName="notes-list-sort-control__menu"
      render={({ close }) => (
        <PopupList.ButtonGroup>
          {sortOptions.map((option) => (
            <PopupList.Button
              active={activeSort === option.value}
              key={option.value}
              onClick={() => {
                close()
                void refineListData({ page: 1, sort: option.value })
              }}
            >
              {option.label}
            </PopupList.Button>
          ))}
        </PopupList.ButtonGroup>
      )}
      showScrollbar
      size="fit-content"
      verticalAlign="bottom"
    />,
    actionsContainer,
  )
}

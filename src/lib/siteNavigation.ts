export type SiteNavigationItem = {
  label: string
  url: string
}

export type CollectionNavigationItem = SiteNavigationItem & {
  collectionSlug: 'notes' | 'photos'
  kind: 'collection'
}

export const notesNavigationItem = {
  collectionSlug: 'notes',
  kind: 'collection',
  label: 'Notes',
  url: '/notes',
} as const satisfies CollectionNavigationItem

export const photosNavigationItem = {
  collectionSlug: 'photos',
  kind: 'collection',
  label: 'Photos',
  url: '/photos',
} as const satisfies CollectionNavigationItem

export function orderSiteNavigationItems<T extends SiteNavigationItem>(items: readonly T[]) {
  const orderedItems: Array<T | CollectionNavigationItem> = items.filter(
    (item) => item.url !== '/playground',
  )

  if (!orderedItems.some((item) => item.url === notesNavigationItem.url)) {
    const workIndex = orderedItems.findIndex((item) => item.url === '/work')
    orderedItems.splice(
      workIndex >= 0 ? workIndex + 1 : orderedItems.length,
      0,
      notesNavigationItem,
    )
  }

  if (!orderedItems.some((item) => item.url === photosNavigationItem.url)) {
    const notesIndex = orderedItems.findIndex((item) => item.url === notesNavigationItem.url)
    orderedItems.splice(notesIndex >= 0 ? notesIndex + 1 : orderedItems.length, 0, photosNavigationItem)
  }

  return orderedItems
}

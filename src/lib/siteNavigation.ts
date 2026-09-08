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
  const orderedItems: Array<T | CollectionNavigationItem> = [...items]

  if (!orderedItems.some((item) => item.url === notesNavigationItem.url)) {
    const playgroundIndex = orderedItems.findIndex((item) => item.url === '/playground')
    orderedItems.splice(
      playgroundIndex >= 0 ? playgroundIndex + 1 : orderedItems.length,
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

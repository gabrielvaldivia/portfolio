export type SiteNavigationItem = {
  label: string
  url: string
}

export const notesNavigationItem = {
  kind: 'notes',
  label: 'Notes',
  url: '/notes',
} as const satisfies SiteNavigationItem & { kind: 'notes' }

export function orderSiteNavigationItems<T extends SiteNavigationItem>(items: readonly T[]) {
  const notesItem = items.find((item) => item.url === notesNavigationItem.url) ?? notesNavigationItem
  const orderedItems: Array<T | typeof notesNavigationItem> = items.filter(
    (item) => item.url !== notesNavigationItem.url,
  )
  const playgroundIndex = orderedItems.findIndex((item) => item.url === '/playground')

  orderedItems.splice(playgroundIndex >= 0 ? playgroundIndex + 1 : orderedItems.length, 0, notesItem)

  return orderedItems
}

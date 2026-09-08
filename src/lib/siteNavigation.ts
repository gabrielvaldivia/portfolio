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
  if (items.some((item) => item.url === notesNavigationItem.url)) return [...items]

  const orderedItems: Array<T | typeof notesNavigationItem> = [...items]
  const playgroundIndex = orderedItems.findIndex((item) => item.url === '/playground')

  orderedItems.splice(playgroundIndex >= 0 ? playgroundIndex + 1 : orderedItems.length, 0, notesNavigationItem)

  return orderedItems
}

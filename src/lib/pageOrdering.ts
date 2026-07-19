export type OrderedPage = {
  id?: number | string
  order?: number | string | null
  slug?: string | null
  title?: string | null
}

function getSortableOrder(order: OrderedPage['order']) {
  if (typeof order === 'number' && Number.isFinite(order)) return order
  if (typeof order === 'string' && order.trim()) {
    const parsed = Number(order)
    if (Number.isFinite(parsed)) return parsed
  }

  return Number.POSITIVE_INFINITY
}

function getSortableLabel(page: OrderedPage) {
  return (page.title || page.slug || '').toLocaleLowerCase()
}

export function getPagePath(slug?: string | null) {
  if (!slug) return null
  if (slug === 'home') return '/'
  return `/${slug.replace(/^\/+/, '')}`
}

export function sortPagesByOrder<T extends OrderedPage>(pages: T[]) {
  return [...pages].sort((a, b) => {
    const orderDifference = getSortableOrder(a.order) - getSortableOrder(b.order)
    if (orderDifference !== 0) return orderDifference

    const labelDifference = getSortableLabel(a).localeCompare(getSortableLabel(b))
    if (labelDifference !== 0) return labelDifference

    return String(a.id ?? '').localeCompare(String(b.id ?? ''))
  })
}

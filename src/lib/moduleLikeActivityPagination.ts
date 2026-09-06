export const MODULE_LIKE_ACTIVITY_PAGE_SIZE = 50
export const MODULE_LIKE_FEED_PAGE_SIZE = 36

export function normalizeActivityCursor(cursor: { createdAt: string; id: string } | null | undefined) {
  if (!cursor) return null
  const createdAt = new Date(cursor.createdAt)
  const id = typeof cursor.id === 'string' ? cursor.id.trim() : ''
  if (Number.isNaN(createdAt.getTime()) || !/^(?:(?:chat|like):\d+|highlight:\d+:[a-f0-9]{64})$/.test(id)) return null
  return { createdAt: createdAt.toISOString(), id }
}

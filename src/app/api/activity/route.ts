import { NextResponse } from 'next/server'
import {
  getModuleLikeActivityPage,
  getModuleLikeFeedPage,
  type ModuleLikeActivityCursor,
  type ModuleLikeFeedCursor,
} from '@/lib/moduleLikeActivity'
import {
  MODULE_LIKE_ACTIVITY_PAGE_SIZE,
  MODULE_LIKE_FEED_PAGE_SIZE,
} from '@/lib/moduleLikeActivityPagination'

export const runtime = 'nodejs'

const MAX_PAGE_SIZE = 100

function getRequestedLimit(value: string | null, fallback: number) {
  const requestedLimit = Number(value)
  if (!Number.isFinite(requestedLimit)) return fallback

  return Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_PAGE_SIZE)
}

function getActivityCursor(url: URL): ModuleLikeActivityCursor | null {
  const createdAt = url.searchParams.get('cursorCreatedAt')
  const id = url.searchParams.get('cursorId')

  return createdAt && id ? { createdAt, id } : null
}

function getFeedCursor(url: URL): ModuleLikeFeedCursor | null {
  const rawLikeCount = url.searchParams.get('cursorLikeCount')
  const updatedAt = url.searchParams.get('cursorUpdatedAt')
  const targetId = url.searchParams.get('cursorTargetId')
  const likeCount = Number(rawLikeCount)

  return Number.isFinite(likeCount) && updatedAt && targetId
    ? { likeCount, updatedAt, targetId }
    : null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const view = url.searchParams.get('view') === 'feed' ? 'feed' : 'activity'

  try {
    const page = view === 'feed'
      ? await getModuleLikeFeedPage({
        cursor: getFeedCursor(url),
        limit: getRequestedLimit(url.searchParams.get('limit'), MODULE_LIKE_FEED_PAGE_SIZE),
      })
      : await getModuleLikeActivityPage({
        cursor: getActivityCursor(url),
        limit: getRequestedLimit(url.searchParams.get('limit'), MODULE_LIKE_ACTIVITY_PAGE_SIZE),
      })

    return NextResponse.json(page, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Unable to load activity page.', error)
    return NextResponse.json({ error: 'Unable to load activity' }, { status: 500 })
  }
}

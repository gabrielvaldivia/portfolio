import { createHash, randomUUID } from 'crypto'
import { sql } from '@payloadcms/db-postgres'
import { NextRequest, NextResponse } from 'next/server'
import {
  ensureModuleLikesTables,
  getModuleLikeRequestLocation,
  readRows,
} from '@/lib/moduleLikeActivity'
import { getPayload } from '@/lib/payload'
import {
  MAX_MODULE_LIKES_PER_VISITOR,
  SUPER_MODULE_LIKE_AMOUNT,
  type ModuleLikeData,
} from '@/lib/moduleLikes'

export const runtime = 'nodejs'

const COOKIE_NAME = 'gv_module_liker'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const MAX_BATCH_IDS = 80
const MAX_TARGET_ID_LENGTH = 180
const targetIdPattern = /^[a-z0-9:_./-]+$/i

type ModuleLikeRow = {
  target_id: string
  count: number | string
  user_likes: number | string
}

type Visitor = {
  id: string
  shouldSetCookie: boolean
}

function normalizeTargetId(value: unknown) {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (!id || id.length > MAX_TARGET_ID_LENGTH || !targetIdPattern.test(id)) return null
  return id
}

function normalizeLikeAmount(value: unknown) {
  if (value === undefined || value === null) return 1
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return 1
  return Math.min(Math.max(Math.trunc(amount), 1), SUPER_MODULE_LIKE_AMOUNT)
}

function getVisitor(req: NextRequest): Visitor {
  const existing = req.cookies.get(COOKIE_NAME)?.value

  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) {
    return { id: existing, shouldSetCookie: false }
  }

  return { id: randomUUID(), shouldSetCookie: true }
}

function getVisitorHash(visitorId: string) {
  const secret = process.env.PAYLOAD_SECRET || 'module-likes'
  return createHash('sha256').update(`${secret}:${visitorId}`).digest('hex')
}

function withVisitorCookie<T>(data: T, visitor: Visitor, init?: ResponseInit) {
  const response = NextResponse.json(data, init)

  if (visitor.shouldSetCookie) {
    response.cookies.set(COOKIE_NAME, visitor.id, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  return response
}

function logModuleLikeError(message: string, error: unknown) {
  const cause = error && typeof error === 'object' && 'cause' in error ? (error as { cause?: unknown }).cause : null
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? (cause as { code?: string }).code : undefined
  const causeMessage = cause instanceof Error ? cause.message : undefined
  console.error(message, { code: causeCode, detail: causeMessage || 'unknown' })
}

function toLikeData(count: number, userLikes: number): ModuleLikeData {
  return {
    count,
    userLikes,
    hasLiked: userLikes > 0,
    canLike: userLikes < MAX_MODULE_LIKES_PER_VISITOR,
  }
}

async function getLikeData(ids: string[], visitorHash: string) {
  const payload = await getPayload()
  const db = payload.db.drizzle
  const idFragments = ids.map((id) => sql`${id}`)

  await ensureModuleLikesTables(db)

  const result = await db.execute(sql`
    SELECT
      "target_id",
      COALESCE(SUM("like_count"), 0)::int AS "count",
      COALESCE(MAX(CASE WHEN "visitor_hash" = ${visitorHash} THEN "like_count" ELSE 0 END), 0)::int AS "user_likes"
    FROM "module_likes"
    WHERE "target_id" IN (${sql.join(idFragments, sql`, `)})
    GROUP BY "target_id"
  `)

  const rows = readRows<ModuleLikeRow>(result)
  const data: Record<string, ModuleLikeData> = Object.fromEntries(ids.map((id) => [id, toLikeData(0, 0)]))

  for (const row of rows) {
    const count = Number(row.count) || 0
    const userLikes = Number(row.user_likes) || 0
    data[row.target_id] = toLikeData(count, userLikes)
  }

  return data
}

export async function GET(req: NextRequest) {
  const visitor = getVisitor(req)
  const visitorHash = getVisitorHash(visitor.id)
  const rawIds = req.nextUrl.searchParams.get('ids') || ''
  const ids = Array.from(new Set(rawIds.split(',').map(normalizeTargetId).filter((id): id is string => Boolean(id)))).slice(0, MAX_BATCH_IDS)

  if (!ids.length) {
    return withVisitorCookie({}, visitor)
  }

  try {
    const data = await getLikeData(ids, visitorHash)
    return withVisitorCookie(data, visitor)
  } catch (error) {
    logModuleLikeError('Unable to load module likes', error)
    return withVisitorCookie({ error: 'Unable to load likes' }, visitor, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const visitor = getVisitor(req)
  const visitorHash = getVisitorHash(visitor.id)
  let id: string | null = null
  let amount = 1

  try {
    const body = await req.json()
    id = normalizeTargetId(body?.id)
    amount = normalizeLikeAmount(body?.amount)
  } catch {
    id = null
  }

  if (!id) {
    return withVisitorCookie({ error: 'A valid module id is required' }, visitor, { status: 400 })
  }

  try {
    const payload = await getPayload()
    const db = payload.db.drizzle
    const likeLocation = await getModuleLikeRequestLocation(req.headers)

    await ensureModuleLikesTables(db)

    await db.execute(sql`
      WITH "accepted_like" AS (
        INSERT INTO "module_likes" ("target_id", "visitor_hash", "like_count", "created_at", "updated_at")
        VALUES (${id}, ${visitorHash}, ${amount}, now(), now())
        ON CONFLICT ("target_id", "visitor_hash")
        DO UPDATE SET
          "like_count" = LEAST("module_likes"."like_count" + ${amount}, ${MAX_MODULE_LIKES_PER_VISITOR}),
          "updated_at" = now()
        WHERE "module_likes"."like_count" < ${MAX_MODULE_LIKES_PER_VISITOR}
        RETURNING "target_id"
      )
      INSERT INTO "module_like_events" ("target_id", "visitor_hash", "amount", "location", "city", "region", "country", "created_at")
      SELECT ${id}, ${visitorHash}, ${amount}, ${likeLocation.location}, ${likeLocation.city}, ${likeLocation.region}, ${likeLocation.country}, now()
      FROM "accepted_like"
    `)

    const data = await getLikeData([id], visitorHash)
    return withVisitorCookie(data[id], visitor)
  } catch (error) {
    logModuleLikeError('Unable to save module like', error)
    return withVisitorCookie({ error: 'Unable to save like' }, visitor, { status: 500 })
  }
}

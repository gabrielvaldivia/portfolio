import { sql } from '@payloadcms/db-postgres'
import { getPayload } from '@/lib/payload'
import { normalizeConversationMessages } from '@/lib/chatMessages'
import {
  applyConversationOwnerCookie,
  getConversationOwner,
} from '@/lib/conversationOwnership'
import { toPublicConversation } from '@/lib/publicConversation'
import { NextRequest, NextResponse } from 'next/server'
// @ts-expect-error — tz-lookup ships no types; the runtime signature is (lat, lng) => string
import tzlookup from 'tz-lookup'

const DEFAULT_SUMMARY_LIMIT = 40
const MAX_SUMMARY_LIMIT = 100

function lookupTz(lat: unknown, lng: unknown): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  try {
    return tzlookup(lat, lng) as string
  } catch {
    return null
  }
}

function readRows(result: unknown): any[] {
  if (Array.isArray(result)) return result
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) return result.rows
  return []
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const summaryMode = url.searchParams.get('summary')
  const payload = await getPayload()

  if (summaryMode === 'markers') {
    const result = await payload.db.drizzle.execute(sql`
      SELECT
        "id",
        "title",
        "latitude",
        "longitude"
      FROM "conversations"
      WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL
      ORDER BY "updated_at" DESC, "id" DESC
      LIMIT 500;
    `)
    const markers = readRows(result)
    return Response.json(markers, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    })
  }

  if (summaryMode === '1') {
    const requestedLimit = Number(url.searchParams.get('limit'))
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_SUMMARY_LIMIT)
      : DEFAULT_SUMMARY_LIMIT
    const cursorUpdatedAt = url.searchParams.get('cursorUpdatedAt')
    const cursorId = Number(url.searchParams.get('cursorId'))
    const hasCursor = Boolean(cursorUpdatedAt) && Number.isFinite(cursorId)
    const cursorFilter = hasCursor
      ? sql`WHERE ("updated_at", "id") < (${cursorUpdatedAt}, ${cursorId})`
      : sql``

    const result = await payload.db.drizzle.execute(sql`
      SELECT
        "id",
        "title",
        "location",
        "latitude",
        "longitude",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt",
        COALESCE((
          SELECT "message"->>'content'
          FROM jsonb_array_elements(COALESCE("messages", '[]'::jsonb)) AS "message"
          WHERE "message"->>'role' = 'user'
          LIMIT 1
        ), '') AS "preview"
      FROM "conversations"
      ${cursorFilter}
      ORDER BY "updated_at" DESC, "id" DESC
      LIMIT ${limit + 1};
    `)
    const rows = readRows(result)
    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map((row) => ({
      ...row,
      timezone: lookupTz(row.latitude, row.longitude),
    }))
    const last = items.at(-1)

    return Response.json({
      items,
      nextCursor: hasMore && last
        ? { updatedAt: last.updatedAt, id: last.id }
        : null,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    })
  }

  return Response.json({ error: 'A summary mode is required' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 160) : ''
  const location = typeof body?.location === 'string' ? body.location.trim().slice(0, 160) : ''
  const messages = normalizeConversationMessages(body?.messages)

  if (!title || !messages) {
    return Response.json({ error: 'A valid title and messages are required' }, { status: 400 })
  }

  const rawLat = req.headers.get('x-vercel-ip-latitude')
  const rawLng = req.headers.get('x-vercel-ip-longitude')
  const parsedLatitude = rawLat ? Number(rawLat) : null
  const parsedLongitude = rawLng ? Number(rawLng) : null
  const latitude =
    parsedLatitude !== null && Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90
      ? parsedLatitude
      : null
  const longitude =
    parsedLongitude !== null && Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180
      ? parsedLongitude
      : null
  const owner = getConversationOwner(req, true)
  if (!owner) return Response.json({ error: 'Unable to establish conversation ownership' }, { status: 500 })

  const payload = await getPayload()
  const doc = await payload.create({
    collection: 'conversations',
    data: {
      title,
      location,
      messages,
      ownerHash: owner.hash,
      ...(latitude !== null ? { latitude } : {}),
      ...(longitude !== null ? { longitude } : {}),
    },
    overrideAccess: true,
  })

  const response = NextResponse.json(toPublicConversation(doc), { status: 201 })
  return applyConversationOwnerCookie(response, owner)
}

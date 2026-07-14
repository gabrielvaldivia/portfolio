import { sql } from '@payloadcms/db-postgres'
import { getPayload } from '@/lib/payload'
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

export async function GET(req: Request) {
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

  const result = await payload.find({
    collection: 'conversations',
    sort: '-updatedAt',
    limit: 500,
    depth: 0,
  })
  const docs = (result.docs as any[]).map((document) => ({
    ...document,
    timezone: lookupTz(document.latitude, document.longitude),
  }))
  return Response.json(docs)
}

export async function POST(req: Request) {
  const { title, location, messages } = await req.json()

  if (!title || !messages) {
    return Response.json({ error: 'title and messages required' }, { status: 400 })
  }

  const rawLat = req.headers.get('x-vercel-ip-latitude')
  const rawLng = req.headers.get('x-vercel-ip-longitude')
  const latitude = rawLat ? Number(rawLat) : null
  const longitude = rawLng ? Number(rawLng) : null

  const payload = await getPayload()
  const doc = await payload.create({
    collection: 'conversations',
    data: {
      title,
      location: location || '',
      messages,
      ...(Number.isFinite(latitude) && latitude !== null ? { latitude } : {}),
      ...(Number.isFinite(longitude) && longitude !== null ? { longitude } : {}),
    },
  })

  return Response.json(doc)
}

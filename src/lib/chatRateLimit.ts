import { createHash } from 'crypto'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from './payload'
import { getPayloadSecret } from './payloadSecret'

const WINDOW_MS = 60 * 60 * 1_000
const DEFAULT_REQUEST_LIMIT = 12
const DEFAULT_DAILY_REQUEST_LIMIT = 40

function getRequestLimit() {
  const configured = Number(process.env.CHAT_RATE_LIMIT_PER_HOUR)
  if (!Number.isFinite(configured)) return DEFAULT_REQUEST_LIMIT
  return Math.min(Math.max(Math.trunc(configured), 1), 100)
}

function getDailyRequestLimit() {
  const configured = Number(process.env.CHAT_DAILY_REQUEST_LIMIT)
  if (!Number.isFinite(configured)) return DEFAULT_DAILY_REQUEST_LIMIT
  return Math.min(Math.max(Math.trunc(configured), 1), 100)
}

function getClientIdentity(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || headers.get('x-real-ip')?.trim() || 'unknown'
  const userAgent = headers.get('user-agent')?.slice(0, 240) || 'unknown'
  return `${ip}:${userAgent}`
}

function readCounts(result: unknown) {
  let row: any
  if (Array.isArray(result)) row = result[0]
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    row = result.rows[0]
  }
  return {
    hourly: Number(row?.hourly_count) || 0,
    daily: Number(row?.daily_count) || 0,
  }
}

export async function checkChatRateLimit(headers: Headers) {
  const now = new Date()
  const hourStartMs = Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS
  const dayStartMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const hourStartedAt = new Date(hourStartMs)
  const dayStartedAt = new Date(dayStartMs)
  const identity = getClientIdentity(headers)
  const secret = getPayloadSecret()
  const hourlyKeyHash = createHash('sha256')
    .update(`${secret}:hourly:${identity}:${hourStartMs}`)
    .digest('hex')
  const dailyKeyHash = createHash('sha256')
    .update(`${secret}:global-daily:${dayStartMs}`)
    .digest('hex')
  const payload = await getPayload()

  const result = await payload.db.drizzle.execute(sql`
    WITH "cleanup" AS (
      DELETE FROM "chat_rate_limits"
      WHERE "window_started_at" < now() - interval '3 days'
    ),
    "daily_counter" AS (
      INSERT INTO "chat_rate_limits" ("key_hash", "window_started_at", "request_count")
      VALUES (${dailyKeyHash}, ${dayStartedAt}, 1)
      ON CONFLICT ("key_hash")
      DO UPDATE SET "request_count" = "chat_rate_limits"."request_count" + 1
      RETURNING "request_count"
    ),
    "hourly_counter" AS (
      INSERT INTO "chat_rate_limits" ("key_hash", "window_started_at", "request_count")
      VALUES (${hourlyKeyHash}, ${hourStartedAt}, 1)
      ON CONFLICT ("key_hash")
      DO UPDATE SET "request_count" = "chat_rate_limits"."request_count" + 1
      RETURNING "request_count"
    )
    SELECT
      (SELECT "request_count" FROM "hourly_counter") AS "hourly_count",
      (SELECT "request_count" FROM "daily_counter") AS "daily_count";
  `)

  const counts = readCounts(result)
  const limit = getRequestLimit()
  const dailyLimit = getDailyRequestLimit()
  const hourlyAllowed = counts.hourly > 0 && counts.hourly <= limit
  const dailyAllowed = counts.daily > 0 && counts.daily <= dailyLimit
  const hourRetrySeconds = Math.max(Math.ceil((hourStartMs + WINDOW_MS - Date.now()) / 1_000), 1)
  const dayRetrySeconds = Math.max(Math.ceil((dayStartMs + 24 * WINDOW_MS - Date.now()) / 1_000), 1)

  return {
    allowed: hourlyAllowed && dailyAllowed,
    limit,
    remaining: Math.max(limit - counts.hourly, 0),
    dailyLimit,
    dailyRemaining: Math.max(dailyLimit - counts.daily, 0),
    retryAfterSeconds: Math.max(
      hourlyAllowed ? 0 : hourRetrySeconds,
      dailyAllowed ? 0 : dayRetrySeconds,
    ),
  }
}

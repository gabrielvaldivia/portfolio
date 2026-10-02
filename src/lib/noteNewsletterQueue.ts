import { randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'

export const NEWSLETTER_DAILY_LIMIT = 100
export type NewsletterDB = { execute: (query: SQL) => Promise<unknown> }
export type NewsletterMessage = {
  from: string; to: string; subject: string; html: string; text: string
  replyTo?: string; headers: Record<string, string>
}

type Delivery = { id: string; message: NewsletterMessage; first_attempt_at: Date | string | null }
export function newsletterEnvironment() {
  return process.env.VERCEL_ENV || 'local'
}

export function newsletterRows<T>(result: unknown): T[] {
  const rows = Array.isArray(result) ? result : (result as { rows?: T[] })?.rows
  if (!Array.isArray(rows)) throw new Error('Newsletter storage unavailable')
  return rows
}

export async function completeNewsletters(db: NewsletterDB, environment = newsletterEnvironment()) {
  await db.execute(sql`
    WITH completed AS (
      UPDATE note_newsletters n SET completed_at = now()
      WHERE environment = ${environment} AND completed_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM note_newsletter_deliveries d WHERE d.newsletter_id = n.id AND d.status IN ('pending', 'review'))
      RETURNING note_id, completed_at
    )
    UPDATE notes SET newsletter_sent_at = completed.completed_at
    FROM completed WHERE notes.id = completed.note_id
  `)
}

/** Only the production CMS scheduler calls this; publishing itself never contacts Resend. */
export async function processNoteNewsletterQueue(db: NewsletterDB, options: {
  maxMessages?: number
  pause?: (ms: number) => Promise<void>
} = {}) {
  if (!process.env.RESEND_API_KEY) return { status: 'unconfigured', sent: 0 } as const
  const environment = newsletterEnvironment()
  const token = randomUUID()
  const claimed = newsletterRows(await db.execute(sql`
    INSERT INTO note_newsletter_runner (environment, lease_token, lease_until)
    VALUES (${environment}, ${token}, now() + interval '2 minutes')
    ON CONFLICT (environment) DO UPDATE SET lease_token = EXCLUDED.lease_token, lease_until = EXCLUDED.lease_until
    WHERE note_newsletter_runner.lease_until <= now() AND note_newsletter_runner.paused_until <= now()
    RETURNING environment
  `))
  if (!claimed.length) return { status: 'paused', sent: 0 } as const

  const started = Date.now()
  let sent = 0
  const pause = options.pause || ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  try {
    // A lost receipt can only be replayed inside Resend's 24-hour deduplication
    // window. Hold older uncertain deliveries for review rather than duplicating them.
    await db.execute(sql`
      UPDATE note_newsletter_deliveries d SET status = 'review', last_error = 'delivery_receipt_unknown'
      FROM note_newsletters n WHERE n.id = d.newsletter_id AND n.environment = ${environment}
        AND d.status = 'pending' AND d.first_attempt_at < now() - interval '23 hours'
    `)
    await db.execute(sql`
      UPDATE note_newsletter_deliveries d SET status = 'skipped', last_error = NULL
      FROM note_newsletters n WHERE n.id = d.newsletter_id AND n.environment = ${environment}
        AND d.status = 'pending'
        AND NOT EXISTS (SELECT 1 FROM note_subscribers s WHERE s.email = d.email AND s.status = 'subscribed')
    `)
    for (let i = 0; i < (options.maxMessages ?? 25) && Date.now() - started < 40_000; i++) {
      const [delivery] = newsletterRows<Delivery>(await db.execute(sql`
        SELECT d.id, d.message, d.first_attempt_at
        FROM note_newsletter_deliveries d JOIN note_newsletters n ON n.id = d.newsletter_id
        JOIN notes ON notes.id = n.note_id
        WHERE n.environment = ${environment} AND notes._status = 'published'
          AND d.status = 'pending' AND d.next_attempt_at <= now()
          AND EXISTS (SELECT 1 FROM note_newsletter_runner WHERE environment = ${environment} AND lease_token = ${token} AND lease_until > now())
          AND EXISTS (SELECT 1 FROM note_subscribers s WHERE s.email = d.email AND s.status = 'subscribed')
        ORDER BY (d.first_attempt_at IS NULL), n.created_at, n.id, d.id LIMIT 1
      `))
      if (!delivery) break

      // The committed reservation survives crashes, deployments, and note deletion.
      // Retries reuse the same day's slot; all notes share one allowance.
      const reserved = newsletterRows(await db.execute(sql`
        WITH budget AS (
          UPDATE note_newsletter_runner SET budget_day = (now() AT TIME ZONE 'UTC')::date,
            used_today = CASE WHEN budget_day = (now() AT TIME ZONE 'UTC')::date THEN used_today + 1 ELSE 1 END
          WHERE environment = ${environment} AND lease_token = ${token} AND lease_until > now()
            AND (budget_day <> (now() AT TIME ZONE 'UTC')::date OR used_today < ${NEWSLETTER_DAILY_LIMIT})
            AND NOT EXISTS (SELECT 1 FROM note_newsletter_daily_slots WHERE delivery_id = ${delivery.id} AND day = (now() AT TIME ZONE 'UTC')::date)
          RETURNING environment
        )
        INSERT INTO note_newsletter_daily_slots (delivery_id, environment, day)
        SELECT ${delivery.id}::uuid, environment, (now() AT TIME ZONE 'UTC')::date FROM budget
        ON CONFLICT (delivery_id, day) DO NOTHING RETURNING delivery_id
      `))
      if (!reserved.length) {
        const existing = newsletterRows(await db.execute(sql`
          SELECT delivery_id FROM note_newsletter_daily_slots WHERE delivery_id = ${delivery.id} AND day = (now() AT TIME ZONE 'UTC')::date
        `))
        if (!existing.length) break
      }
      const leased = newsletterRows(await db.execute(sql`
        UPDATE note_newsletter_deliveries SET first_attempt_at = COALESCE(first_attempt_at, now()), next_attempt_at = now() + interval '5 minutes'
        WHERE id = ${delivery.id} AND status = 'pending' AND next_attempt_at <= now()
          AND EXISTS (SELECT 1 FROM note_newsletter_runner WHERE environment = ${environment} AND lease_token = ${token} AND lease_until > now())
        RETURNING id
      `))
      if (!leased.length) break

      let failure = 'network_error'
      let uncertain = true
      let providerID: string | undefined
      try {
        const { replyTo, ...message } = delivery.message
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `note-newsletter/${delivery.id}` },
          body: JSON.stringify({ ...message, ...(replyTo ? { reply_to: replyTo } : {}) }),
          signal: AbortSignal.timeout(8_000),
        })
        const result = await response.json()
        if (response.ok && typeof result.id === 'string') providerID = result.id
        else {
          failure = typeof result.name === 'string' ? result.name.slice(0, 100) : 'provider_error'
          uncertain = response.status >= 500 || response.ok
        }
      } catch {
        // A timeout may follow a successful send. Retry the exact saved message/key.
      }
      if (providerID) {
        // If saving this receipt fails, retain the original attempt time and key.
        await db.execute(sql`
          UPDATE note_newsletter_deliveries SET status = 'sent', sent_at = now(), provider_id = ${providerID}, last_error = NULL
          WHERE id = ${delivery.id}
        `)
        sent++
        await pause(200)
        continue
      }

      await db.execute(sql`
        UPDATE note_newsletter_deliveries SET last_error = ${failure}, next_attempt_at = now() + interval '5 minutes',
          first_attempt_at = CASE WHEN ${!uncertain && !delivery.first_attempt_at} THEN NULL ELSE first_attempt_at END
        WHERE id = ${delivery.id}
      `)
      // Other site mail (or inbound mail) can exhaust the account quota sooner.
      // Stop the whole queue and automatically resume without dropping recipients.
      await db.execute(sql`
        UPDATE note_newsletter_runner SET last_error = ${failure}, paused_until = CASE
          WHEN ${failure} = 'daily_quota_exceeded' THEN (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC'
          WHEN ${failure} = 'monthly_quota_exceeded' THEN now() + interval '1 day'
          WHEN ${failure} IN ('network_error', 'rate_limit_exceeded') THEN now() + interval '5 minutes'
          ELSE now() + interval '1 hour' END
        WHERE environment = ${environment} AND lease_token = ${token}
      `)
      return { status: 'deferred', sent } as const
    }
    await completeNewsletters(db, environment)
    return { status: 'processed', sent } as const
  } finally {
    await db.execute(sql`
      UPDATE note_newsletter_runner SET lease_until = now() WHERE environment = ${environment} AND lease_token = ${token}
    `)
  }
}

export async function getNoteNewsletterStatus(db: NewsletterDB, noteID: number) {
  const environment = newsletterEnvironment()
  const [result] = newsletterRows<{
    queued: boolean; total: number; sent: number; pending: number; skipped: number; review: number
    completedAt: string | null; pausedUntil: string | null; lastError: string | null; usedToday: number
  }>(await db.execute(sql`
    SELECT EXISTS (SELECT 1 FROM note_newsletters WHERE note_id = ${noteID} AND environment = ${environment}) AS queued,
      count(d.id)::int AS total,
      count(d.id) FILTER (WHERE d.status = 'sent')::int AS sent,
      count(d.id) FILTER (WHERE d.status = 'pending')::int AS pending,
      count(d.id) FILTER (WHERE d.status = 'skipped')::int AS skipped,
      count(d.id) FILTER (WHERE d.status = 'review')::int AS review,
      max(n.completed_at)::text AS "completedAt",
      (SELECT paused_until::text FROM note_newsletter_runner WHERE environment = ${environment} AND paused_until > now()) AS "pausedUntil",
      (SELECT last_error FROM note_newsletter_runner WHERE environment = ${environment} AND paused_until > now()) AS "lastError",
      COALESCE((SELECT used_today FROM note_newsletter_runner WHERE environment = ${environment} AND budget_day = (now() AT TIME ZONE 'UTC')::date), 0) AS "usedToday"
    FROM note_newsletters n LEFT JOIN note_newsletter_deliveries d ON d.newsletter_id = n.id
    WHERE n.note_id = ${noteID} AND n.environment = ${environment}
  `))
  return { ...result, dailyLimit: NEWSLETTER_DAILY_LIMIT }
}

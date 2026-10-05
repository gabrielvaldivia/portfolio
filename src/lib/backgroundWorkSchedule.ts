import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'
import { NEWSLETTER_DAILY_LIMIT } from './noteNewsletterQueue'

export type BackgroundJob = 'publishing' | 'notifications' | 'newsletters'
export type BackgroundWorkSchedule = Record<BackgroundJob, string | null>
type ScheduleDB = { execute: (query: SQL) => Promise<unknown> }

/** Read timestamps only; email contents and note bodies never enter this cache. */
export async function readBackgroundWorkSchedule(db: ScheduleDB, environment: string): Promise<BackgroundWorkSchedule> {
  const result = await db.execute(sql`
    SELECT
      (SELECT min(scheduled_for) FROM notes
        WHERE _status = 'draft' AND scheduled_for IS NOT NULL) AS publishing,
      (SELECT min(next_attempt_at) FROM engagement_notifications
        WHERE sent_at IS NULL AND environment = ${environment}) AS notifications,
      (SELECT min(GREATEST(
        d.next_attempt_at, r.lease_until, r.paused_until,
        CASE WHEN r.budget_day = (now() AT TIME ZONE 'UTC')::date
          AND r.used_today >= ${NEWSLETTER_DAILY_LIMIT}
          AND NOT EXISTS (SELECT 1 FROM note_newsletter_daily_slots s
            WHERE s.delivery_id = d.id AND s.day = (now() AT TIME ZONE 'UTC')::date)
          THEN (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC'
          ELSE d.next_attempt_at END
      )) FROM note_newsletter_deliveries d
        JOIN note_newsletters n ON n.id = d.newsletter_id
        JOIN notes ON notes.id = n.note_id
        LEFT JOIN note_newsletter_runner r ON r.environment = n.environment
        WHERE n.environment = ${environment} AND notes._status = 'published'
          AND d.status = 'pending') AS newsletters
  `)
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] })?.rows
  if (!rows?.[0]) throw new Error('Background work schedule unavailable')
  const row = rows[0] as Record<BackgroundJob, string | Date | null>
  const timestamp = (value: string | Date | null) => value === null ? null : new Date(value).toISOString()
  return {
    publishing: timestamp(row.publishing),
    notifications: timestamp(row.notifications),
    newsletters: timestamp(row.newsletters),
  }
}

export function isBackgroundWorkDue(schedule: BackgroundWorkSchedule, job: BackgroundJob, now = Date.now()) {
  const next = schedule[job]
  return next !== null && new Date(next).getTime() <= now
}

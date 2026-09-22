import { sql } from '@payloadcms/db-postgres'
import type { SQL } from 'drizzle-orm'
import { Resend } from 'resend'
import type { engagementNotification } from './engagementAccess'

type QueueDB = { execute: (query: SQL) => Promise<unknown> }
type Notification = ReturnType<typeof engagementNotification>
type PendingNotification = { idempotency_key: string; message: Notification['message'] }

function rows<T>(result: unknown): T[] {
  const values = Array.isArray(result) ? result : (result as { rows?: T[] })?.rows
  if (!Array.isArray(values)) throw new Error('Notification storage unavailable')
  return values
}

function environment() {
  return process.env.NODE_ENV === 'production' ? 'production' : 'local'
}

export async function queueEngagementNotification(db: QueueDB, notification: Notification) {
  // Save the original payload so retries remain identical, even after a deployment.
  const saved = rows<{ idempotency_key: string }>(await db.execute(sql`
    INSERT INTO engagement_notifications (idempotency_key, environment, message)
    VALUES (${notification.idempotencyKey}, ${environment()}, ${JSON.stringify(notification.message)}::jsonb)
    ON CONFLICT (idempotency_key) DO UPDATE
      SET idempotency_key = EXCLUDED.idempotency_key
    RETURNING idempotency_key
  `))
  if (!saved.length) throw new Error('Email address could not be saved')
}

export async function deliverNextEngagementNotification(db: QueueDB) {
  if (!process.env.RESEND_API_KEY) return { status: 'unconfigured' } as const

  // A short lease prevents overlapping scheduler runs from sending the same entry.
  const [pending] = rows<PendingNotification>(await db.execute(sql`
    WITH next AS (
      SELECT idempotency_key FROM engagement_notifications
      WHERE sent_at IS NULL AND next_attempt_at <= now() AND environment = ${environment()}
      ORDER BY created_at
      LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE engagement_notifications AS notifications
    SET next_attempt_at = now() + interval '5 minutes'
    FROM next WHERE notifications.idempotency_key = next.idempotency_key
    RETURNING notifications.idempotency_key, notifications.message
  `))
  if (!pending) return { status: 'empty' } as const

  let failure = 'network_error'
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(pending.message, {
      idempotencyKey: pending.idempotency_key,
    })
    if (!result.error && result.data?.id) {
      await db.execute(sql`
        UPDATE engagement_notifications SET sent_at = now(), last_error = NULL
        WHERE idempotency_key = ${pending.idempotency_key}
      `)
      return { status: 'sent' } as const
    }
    failure = result.error?.name || 'missing_email_id'
  } catch {
    // A provider or receipt-storage failure is safe to retry with the same key.
  }

  await db.execute(sql`
    UPDATE engagement_notifications
    SET next_attempt_at = now() + interval '1 hour', last_error = ${failure}
    WHERE idempotency_key = ${pending.idempotency_key}
  `)
  if (failure === 'daily_quota_exceeded' || failure === 'monthly_quota_exceeded') {
    await db.execute(sql`
      UPDATE engagement_notifications SET next_attempt_at = now() + interval '1 hour'
      WHERE sent_at IS NULL AND environment = ${environment()} AND next_attempt_at <= now()
    `)
  }
  console.warn('Engagement notification deferred:', failure)
  return { status: 'deferred' } as const
}

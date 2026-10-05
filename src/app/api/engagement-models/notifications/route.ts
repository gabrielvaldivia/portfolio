import { deliverNextEngagementNotification } from '@/lib/engagementNotificationQueue'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { invalidateBackgroundWork, shouldRunBackgroundWork } from '@/lib/backgroundWork'

export const runtime = 'nodejs'
export const revalidate = 0
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'Scheduler authentication is not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let ran = false
  try {
    if (!await shouldRunBackgroundWork('notifications')) {
      return Response.json({ status: 'empty', skipped: true }, { headers: { 'Cache-Control': 'no-store' } })
    }
    ran = true
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Database unavailable')
    const result = await deliverNextEngagementNotification(payload.db.drizzle)
    return Response.json(result, {
      status: result.status === 'unconfigured' ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Engagement notification retry failed:', error instanceof Error ? error.name : 'unknown')
    return Response.json({ error: 'Notification retry failed.' }, { status: 500 })
  } finally {
    if (ran) invalidateBackgroundWork()
  }
}

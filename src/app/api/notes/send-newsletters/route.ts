import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { processNoteNewsletterQueue } from '@/lib/noteNewsletterQueue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'Scheduler authentication is not configured' }, { status: 503, headers })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
  if (process.env.VERCEL_ENV !== 'production') return Response.json({ error: 'Newsletter delivery runs in production only' }, { status: 403, headers })
  try {
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Database unavailable')
    const result = await processNoteNewsletterQueue(payload.db.drizzle)
    return Response.json(result, { status: result.status === 'unconfigured' ? 503 : 200, headers })
  } catch (error) {
    console.error('Newsletter delivery failed:', error instanceof Error ? error.name : 'unknown')
    return Response.json({ error: 'Newsletter delivery will retry automatically.' }, { status: 500, headers })
  }
}

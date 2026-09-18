import { revalidatePath } from 'next/cache'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { publishScheduledNotes } from '@/lib/notePublishing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'Scheduler authentication is not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Database unavailable')
    const published = await publishScheduledNotes(payload)
    if (published.length) {
      revalidatePath('/notes', 'layout')
      revalidatePath('/notes/index.md')
      revalidatePath('/notes/rss.xml')
      revalidatePath('/sitemap.xml')
      for (const note of published) revalidatePath(`/notes/${note.slug}`)
    }
    return Response.json({ published: published.length }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Scheduled note publication failed', error)
    return Response.json({ error: 'Scheduled publishing failed; the next run will retry.' }, { status: 500 })
  }
}

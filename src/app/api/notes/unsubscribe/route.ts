import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getSiteURL, verifySubscriptionToken } from '@/lib/noteSubscriptions'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function readToken(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  return token.length <= 2048 ? verifySubscriptionToken(token, 'unsubscribe') : null
}

function redirect(query: string) {
  return NextResponse.redirect(`${getSiteURL()}/notes/subscription?${query}`, {
    status: 303,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  })
}

async function unsubscribe(request: Request) {
  const verified = readToken(request)
  if (!verified) return false

  const payload = await getPayload()
  if (isPayloadUnavailable(payload)) throw new Error('Payload is unavailable')

  const result = await payload.find({
    collection: 'note-subscribers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: verified.email } },
  })
  const subscriber = result.docs[0]

  if (subscriber) {
    await payload.update({
      collection: 'note-subscribers',
      id: subscriber.id,
      data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  }

  return true
}

// Mail scanners open links before readers do, so the link only shows a
// confirmation page. Unsubscribing takes a POST from that page or the
// mail client's one-click List-Unsubscribe request.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!readToken(request)) return redirect('status=invalid-unsubscribe')
  return redirect(`status=unsubscribe&token=${encodeURIComponent(token)}`)
}

export async function POST(request: Request) {
  const form = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')
    ? await request.formData().catch(() => null)
    : null
  const fromPage = form?.get('confirm') === '1'
  try {
    const unsubscribed = await unsubscribe(request)
    if (fromPage) return redirect(`status=${unsubscribed ? 'unsubscribed' : 'invalid-unsubscribe'}`)
    return new Response(null, { status: unsubscribed ? 204 : 400 })
  } catch (error) {
    console.error('Notes unsubscribe failed:', error)
    if (fromPage) return redirect('status=unsubscribe-error')
    return new Response(null, { status: 500 })
  }
}

import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getSiteURL, verifySubscriptionToken } from '@/lib/noteSubscriptions'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function unsubscribe(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const verified = token.length <= 2048 ? verifySubscriptionToken(token, 'unsubscribe') : null
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

export async function GET(request: Request) {
  let status: 'invalid' | 'unsubscribed' = 'invalid'
  try {
    if (await unsubscribe(request)) status = 'unsubscribed'
  } catch (error) {
    console.error('Notes unsubscribe failed:', error)
  }
  return NextResponse.redirect(`${getSiteURL()}/notes?subscription=${status}#email-updates`, 303)
}

export async function POST(request: Request) {
  try {
    return new Response(null, { status: (await unsubscribe(request)) ? 204 : 400 })
  } catch (error) {
    console.error('Notes unsubscribe failed:', error)
    return new Response(null, { status: 500 })
  }
}

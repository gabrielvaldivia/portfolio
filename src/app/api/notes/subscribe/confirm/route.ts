import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getSiteURL, verifySubscriptionToken } from '@/lib/noteSubscriptions'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function redirect(status: 'confirmed' | 'invalid') {
  return NextResponse.redirect(`${getSiteURL()}/notes?subscription=${status}#email-updates`, 303)
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const verified = token.length <= 2048 ? verifySubscriptionToken(token, 'confirm') : null
  if (!verified) return redirect('invalid')

  try {
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Payload is unavailable')

    const result = await payload.find({
      collection: 'note-subscribers',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: verified.email } },
    })
    const now = new Date().toISOString()
    const subscriber = result.docs[0]

    if (subscriber) {
      await payload.update({
        collection: 'note-subscribers',
        id: subscriber.id,
        data: { confirmedAt: subscriber.confirmedAt || now, status: 'subscribed', unsubscribedAt: null },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'note-subscribers',
        data: { confirmedAt: now, email: verified.email, source: 'confirmation-link', status: 'subscribed' },
        overrideAccess: true,
      })
    }

    return redirect('confirmed')
  } catch (error) {
    console.error('Notes confirmation failed:', error)
    return redirect('invalid')
  }
}

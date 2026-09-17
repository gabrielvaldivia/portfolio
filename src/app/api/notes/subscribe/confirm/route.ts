import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getSiteURL, verifySubscriptionToken } from '@/lib/noteSubscriptions'
import { confirmNoteSubscription } from '@/lib/noteSubscriptionConfirmation'
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

    await confirmNoteSubscription(payload, verified.email)

    return redirect('confirmed')
  } catch (error) {
    console.error('Notes confirmation failed:', error)
    return redirect('invalid')
  }
}

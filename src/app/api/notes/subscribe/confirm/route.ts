import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getSiteURL, verifySubscriptionToken } from '@/lib/noteSubscriptions'
import { confirmNoteSubscription } from '@/lib/noteSubscriptionConfirmation'
import { subscriptionActionPage } from '@/lib/subscriptionActionPage'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function redirect(status: 'confirmed' | 'invalid' | 'error') {
  return NextResponse.redirect(`${getSiteURL()}/notes/subscription?status=${status}`, {
    status: 303,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  })
}

function readToken(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  return { token, verified: token.length <= 2048 ? verifySubscriptionToken(token, 'confirm') : null }
}

export async function GET(request: Request) {
  const { token, verified } = readToken(request)
  if (!verified) return redirect('invalid')
  return subscriptionActionPage({
    title: 'Confirm your subscription',
    description: 'You’ll receive an email whenever Gabe publishes a new note.',
    action: `/api/notes/subscribe/confirm?token=${encodeURIComponent(token)}`,
    button: 'Confirm subscription',
  })
}

export async function POST(request: Request) {
  const { verified } = readToken(request)
  if (!verified) return redirect('invalid')

  try {
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Payload is unavailable')

    const confirmed = await confirmNoteSubscription(payload, verified.email)

    return redirect(confirmed ? 'confirmed' : 'invalid')
  } catch (error) {
    console.error('Notes confirmation failed:', error)
    return redirect('error')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkEngagementAccessRateLimit } from '@/lib/chatRateLimit'
import {
  createEngagementAccessToken,
  ENGAGEMENT_ACCESS_COOKIE,
  ENGAGEMENT_ACCESS_MAX_AGE,
  engagementNotification,
  hasEngagementAccess,
  isValidEngagementEmail,
  normalizeEngagementEmail,
} from '@/lib/engagementAccess'
import { assertSameOrigin, readJSONBody, requestErrorResponse } from '@/lib/httpRequest'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    assertSameOrigin(request, { requireOrigin: true })
    body = await readJSONBody(request, { maxBytes: 2_048 })
  } catch (error) {
    return requestErrorResponse(error) || Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const email = normalizeEngagementEmail(body.email)
  if (body.website || !isValidEngagementEmail(email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  if (hasEngagementAccess(request.cookies.get(ENGAGEMENT_ACCESS_COOKIE)?.value)) {
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Access is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }

  let stage = 'rate-limit'
  try {
    const rateLimit = await checkEngagementAccessRateLimit(request.headers)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    stage = 'notification'
    const notification = engagementNotification(email)
    const resend = new Resend(process.env.RESEND_API_KEY)
    stage = 'email'
    const result = await resend.emails.send(notification.message, {
      idempotencyKey: notification.idempotencyKey,
    })
    if (result.error || !result.data?.id) {
      console.error('Engagement notification rejected:', {
        name: result.error?.name || 'missing_email_id',
        statusCode: result.error?.statusCode,
      })
      throw new Error('Notification was not accepted')
    }

    // Grant access only after the notification is accepted; failed sends can be retried.
    stage = 'access-cookie'
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
    response.cookies.set(ENGAGEMENT_ACCESS_COOKIE, createEngagementAccessToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ENGAGEMENT_ACCESS_MAX_AGE,
    })
    return response
  } catch (error) {
    const cause = error instanceof Error ? error.cause as { code?: string; message?: string } | undefined : undefined
    console.error('Engagement access unavailable:', {
      stage,
      name: error instanceof Error ? error.name : 'unknown',
      message: error instanceof Error && !cause ? error.message : undefined,
      code: cause?.code,
      cause: cause?.message,
    })
    return Response.json(
      { error: 'Could not open the engagement models. Please try again.' },
      { status: 503 },
    )
  }
}

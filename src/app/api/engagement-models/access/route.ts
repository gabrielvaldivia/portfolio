import { NextRequest, NextResponse } from 'next/server'
import { checkEngagementAccessRateLimit } from '@/lib/chatRateLimit'
import { queueEngagementNotification } from '@/lib/engagementNotificationQueue'
import { getPayload } from '@/lib/payload'
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

  let stage = 'rate-limit'
  try {
    const rateLimit = await checkEngagementAccessRateLimit(request.headers)
    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }

    stage = 'save-email'
    const payload = await getPayload()
    await queueEngagementNotification(payload.db.drizzle, engagementNotification(email))

    // The email is safely stored; provider quotas must not prevent opening the page.
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
      { error: 'Could not open Working together. Please try again.' },
      { status: 503 },
    )
  }
}

import { createHash } from 'node:crypto'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import {
  createSubscriptionToken,
  getSiteURL,
  isValidSubscriberEmail,
  normalizeSubscriberEmail,
} from '@/lib/noteSubscriptions'
import { Resend } from 'resend'
import { assertSameOrigin, readJSONBody, requestErrorResponse } from '@/lib/httpRequest'
import { checkNoteSubscriptionRateLimit } from '@/lib/chatRateLimit'

export const dynamic = 'force-dynamic'

const CONFIRM_TTL_SECONDS = 60 * 60 * 48
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_BODY_BYTES = 2_048

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function confirmationEmail(email: string, confirmationURL: string) {
  const from = process.env.NOTES_EMAIL_FROM || 'Gabriel Valdivia <notes@gabrielvaldivia.com>'

  return {
    from,
    html: `<!doctype html><html><body style="margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif"><main style="max-width:600px;margin:0 auto;padding:48px 24px"><h1 style="margin:0 0 20px;font-size:32px;line-height:1.15;font-weight:500">Confirm your Notes subscription</h1><p style="margin:0 0 28px;color:#555;font-size:18px;line-height:1.55">Click below to receive an email whenever Gabriel publishes a new note.</p><a href="${confirmationURL}" style="display:inline-block;color:#fff;background:#111;border-radius:8px;padding:12px 18px;font-size:16px;font-weight:600;text-decoration:none">Confirm subscription</a><p style="margin:36px 0 0;color:#888;font-size:13px;line-height:1.5">If you didn’t request this, you can ignore this email.</p></main></body></html>`,
    replyTo: process.env.NOTES_EMAIL_REPLY_TO || undefined,
    subject: 'Confirm your Notes subscription',
    text: `Confirm your Notes subscription\n\nUse this link to confirm that you want an email whenever Gabriel publishes a new note:\n${confirmationURL}\n\nIf you didn't request this, you can ignore this email.`,
    to: email,
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    assertSameOrigin(request)
    body = await readJSONBody(request, { maxBytes: MAX_BODY_BYTES })
  } catch (error) {
    return requestErrorResponse(error) || Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (clean(body.website)) return Response.json({ ok: true })

  const email = normalizeSubscriberEmail(body.email)
  if (!isValidSubscriberEmail(email)) {
    return Response.json({ error: 'Add a valid email address.' }, { status: 400 })
  }
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email signup is temporarily unavailable.' }, { status: 503 })
  }

  let rateLimit: Awaited<ReturnType<typeof checkNoteSubscriptionRateLimit>>
  try {
    rateLimit = await checkNoteSubscriptionRateLimit(request.headers)
  } catch (error) {
    console.error('Notes subscription rate limit unavailable:', error instanceof Error ? error.name : 'unknown')
    return Response.json({ error: 'Email signup is temporarily unavailable.' }, { status: 503 })
  }

  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Please wait a little before trying again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  try {
    const payload = await getPayload()
    if (isPayloadUnavailable(payload)) throw new Error('Payload is unavailable')

    const existing = await payload.find({
      collection: 'note-subscribers',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: email } },
    })
    const subscriber = existing.docs[0]

    if (subscriber?.status === 'subscribed') {
      return Response.json({ ok: true })
    }

    if (subscriber) {
      await payload.update({
        collection: 'note-subscribers',
        id: subscriber.id,
        data: { status: 'pending', unsubscribedAt: null },
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'note-subscribers',
        data: { email, source: 'website', status: 'pending' },
        overrideAccess: true,
      })
    }

    const token = createSubscriptionToken(email, 'confirm', CONFIRM_TTL_SECONDS)
    const confirmationURL = `${getSiteURL()}/api/notes/subscribe/confirm?token=${encodeURIComponent(token)}`
    const resend = new Resend(process.env.RESEND_API_KEY)
    const idempotencyKey = createHash('sha256')
      .update(`notes-confirm-${email}-${Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS)}`)
      .digest('hex')
    const result = await resend.emails.send(confirmationEmail(email, confirmationURL), {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    if (result.error) throw new Error(result.error.message)

    return Response.json({ ok: true })
  } catch (error) {
    console.error('Notes subscription failed:', error)
    return Response.json({ error: 'Could not start your subscription. Please try again.' }, { status: 500 })
  }
}

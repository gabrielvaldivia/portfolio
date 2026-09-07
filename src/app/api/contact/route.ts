import { Resend } from 'resend'
import { checkContactRateLimit } from '@/lib/chatRateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const recipient = process.env.CONTACT_EMAIL_TO || 'gabe@valdivia.works'
const MAX_BODY_BYTES = 8_192

function cleanField(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { error: Response.json({ error: 'JSON is required.' }, { status: 415 }) }
  }

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: Response.json({ error: 'The request is too large.' }, { status: 413 }) }
  }

  const reader = request.body?.getReader()
  if (!reader) return { error: Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      return { error: Response.json({ error: 'The request is too large.' }, { status: 413 }) }
    }
    chunks.push(value)
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body')
    return { body: parsed as Record<string, unknown> }
  } catch {
    return { error: Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (
    (origin && origin !== new URL(request.url).origin)
    || request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  const parsed = await readBody(request)
  if (parsed.error) return parsed.error
  const body = parsed.body

  const subject = cleanField(body.subject)
  const message = cleanField(body.message)
  const fromEmail = cleanField(body.fromEmail)
  const website = cleanField(body.website)

  if (website) return Response.json({ ok: true })
  if (fromEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return Response.json({ error: 'Add a valid email address.' }, { status: 400 })
  }
  if (!subject || subject.length > 160 || /[\r\n]/.test(subject)) {
    return Response.json({ error: 'Add a subject under 160 characters.' }, { status: 400 })
  }
  if (message.length < 10 || message.length > 5000) {
    return Response.json({ error: 'Write a message between 10 and 5,000 characters.' }, { status: 400 })
  }
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email is temporarily unavailable.' }, { status: 503 })
  }

  let rateLimit: Awaited<ReturnType<typeof checkContactRateLimit>>
  try {
    rateLimit = await checkContactRateLimit(request.headers)
  } catch (error) {
    console.error('Contact rate limit unavailable:', error instanceof Error ? error.name : 'unknown')
    return Response.json({ error: 'Email is temporarily unavailable.' }, { status: 503 })
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
    const resend = new Resend(process.env.RESEND_API_KEY)
    const senderName = fromEmail.replace(/[<>"\r\n]/g, '')
    const result = await resend.emails.send({
      from: `${senderName} <onboarding@resend.dev>`,
      to: recipient,
      replyTo: fromEmail,
      subject,
      text: message,
    })

    if (result.error) throw new Error(result.error.message)
    return Response.json(
      { ok: true },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      },
    )
  } catch (error) {
    console.error('Contact form send failed:', error)
    return Response.json({ error: 'Could not send your message. Please try again.' }, { status: 500 })
  }
}

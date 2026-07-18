import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const recipient = process.env.CONTACT_EMAIL_TO || 'gabe@valdivia.works'

function cleanField(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const subject = cleanField(body.subject)
  const message = cleanField(body.message)
  const fromEmail = cleanField(body.fromEmail)
  const website = cleanField(body.website)

  if (website) return Response.json({ ok: true })
  if (fromEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return Response.json({ error: 'Add a valid email address.' }, { status: 400 })
  }
  if (!subject || subject.length > 160) {
    return Response.json({ error: 'Add a subject under 160 characters.' }, { status: 400 })
  }
  if (message.length < 10 || message.length > 5000) {
    return Response.json({ error: 'Write a message between 10 and 5,000 characters.' }, { status: 400 })
  }
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email is temporarily unavailable.' }, { status: 503 })
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
    return Response.json({ ok: true })
  } catch (error) {
    console.error('Contact form send failed:', error)
    return Response.json({ error: 'Could not send your message. Please try again.' }, { status: 500 })
  }
}

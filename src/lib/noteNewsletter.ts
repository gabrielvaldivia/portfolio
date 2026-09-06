import type { Payload } from 'payload'
import { Resend } from 'resend'
import { escapeHTML, getNoteExcerpt } from './noteContent'
import { createSubscriptionToken, getSiteURL } from './noteSubscriptions'

const UNSUBSCRIBE_TTL_SECONDS = 60 * 60 * 24 * 365 * 10
const EMAIL_BATCH_SIZE = 100

type NewsletterNote = {
  body?: unknown
  excerpt?: string | null
  id: number | string
  publishedAt?: string | null
  slug: string
  title: string
  updatedAt: string
}

type NewsletterSubscriber = {
  email: string
}

function getSender() {
  return process.env.NOTES_EMAIL_FROM || 'Gabriel Valdivia <notes@gabrielvaldivia.com>'
}

function getReplyTo() {
  return process.env.NOTES_EMAIL_REPLY_TO || undefined
}

function subscriptionLinks(email: string) {
  const siteURL = getSiteURL()
  const token = createSubscriptionToken(email, 'unsubscribe', UNSUBSCRIBE_TTL_SECONDS)
  const unsubscribeURL = `${siteURL}/api/notes/unsubscribe?token=${encodeURIComponent(token)}`
  return { siteURL, unsubscribeURL }
}

function buildEmail(note: NewsletterNote, subscriber: NewsletterSubscriber) {
  const { siteURL, unsubscribeURL } = subscriptionLinks(subscriber.email)
  const noteURL = `${siteURL}/notes/${note.slug}`
  const excerpt = getNoteExcerpt(note)
  const title = escapeHTML(note.title)
  const safeExcerpt = escapeHTML(excerpt)

  return {
    from: getSender(),
    headers: {
      'List-Unsubscribe': `<${unsubscribeURL}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    html: `<!doctype html><html><body style="margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif"><main style="max-width:640px;margin:0 auto;padding:48px 24px"><p style="margin:0 0 28px;color:#777;font-size:15px">A new note from Gabriel Valdivia</p><h1 style="margin:0 0 20px;font-size:36px;line-height:1.1;font-weight:500">${title}</h1>${safeExcerpt ? `<p style="margin:0 0 28px;color:#555;font-size:18px;line-height:1.55">${safeExcerpt}</p>` : ''}<a href="${noteURL}" style="color:#111;font-size:16px;font-weight:600;text-decoration:underline">Read the note →</a><hr style="margin:48px 0 20px;border:0;border-top:1px solid #e7e7e7"><p style="margin:0;color:#888;font-size:13px;line-height:1.5">You subscribed to Notes at gabrielvaldivia.com. <a href="${unsubscribeURL}" style="color:#666">Unsubscribe</a></p></main></body></html>`,
    replyTo: getReplyTo(),
    subject: note.title,
    text: `A new note from Gabriel Valdivia\n\n${note.title}\n\n${excerpt}${excerpt ? '\n\n' : ''}Read the note: ${noteURL}\n\nUnsubscribe: ${unsubscribeURL}`,
    to: subscriber.email,
  }
}

async function getSubscribers(payload: Payload) {
  const subscribers: NewsletterSubscriber[] = []
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: 'note-subscribers',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      page,
      where: { status: { equals: 'subscribed' } },
    })

    subscribers.push(...result.docs.map((subscriber) => ({ email: String(subscriber.email) })))
    if (!result.hasNextPage) break
    page += 1
  }

  return subscribers
}

export async function sendPublishedNoteNewsletter(note: NewsletterNote, payload: Payload) {
  const subscribers = await getSubscribers(payload)
  if (subscribers.length === 0) return { recipientCount: 0 }
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required to send Notes email')

  const resend = new Resend(process.env.RESEND_API_KEY)
  for (let index = 0; index < subscribers.length; index += EMAIL_BATCH_SIZE) {
    const batch = subscribers.slice(index, index + EMAIL_BATCH_SIZE).map((subscriber) => buildEmail(note, subscriber))
    const result = await resend.batch.send(batch, {
      headers: { 'Idempotency-Key': `note-${note.id}-${note.publishedAt || note.updatedAt}-${index / EMAIL_BATCH_SIZE}` },
    })
    if (result.error) throw new Error(result.error.message)
  }

  return { recipientCount: subscribers.length }
}

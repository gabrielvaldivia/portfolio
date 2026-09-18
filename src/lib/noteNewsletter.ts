import type { Payload, PayloadRequest } from 'payload'
import { Resend } from 'resend'
import { escapeHTML } from './noteContent'
import { renderNoteEmailContent } from './noteEmailContent'
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

function buildEmail(note: NewsletterNote, subscriber: NewsletterSubscriber, content: ReturnType<typeof renderNoteEmailContent>) {
  const { siteURL, unsubscribeURL } = subscriptionLinks(subscriber.email)

  return {
    from: getSender(),
    headers: {
      'List-Unsubscribe': `<${unsubscribeURL}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"></head><body style="margin:0;padding:0;font-family:Inter,-apple-system,BlinkMacSystemFont,Arial,Helvetica,sans-serif;font-size:18px;line-height:1.65">${content.html}<p style="margin:24px 0 0;font-size:13px;line-height:1.5">You subscribe to Gabriel Valdivia's notes at <a href="${escapeHTML(siteURL)}" style="color:inherit">gabrielvaldivia.com</a>. <a href="${escapeHTML(unsubscribeURL)}" style="color:inherit">Unsubscribe</a></p></body></html>`,
    replyTo: getReplyTo(),
    subject: note.title,
    text: `${content.text}\n\nYou subscribe to Gabriel Valdivia's notes at gabrielvaldivia.com. Unsubscribe: ${unsubscribeURL}`,
    to: subscriber.email,
  }
}

async function getSubscribers(payload: Payload, req?: PayloadRequest) {
  const subscribers: NewsletterSubscriber[] = []
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: 'note-subscribers',
      req,
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

export async function sendPublishedNoteNewsletter(note: NewsletterNote, payload: Payload, req?: PayloadRequest) {
  const subscribers = await getSubscribers(payload, req)
  if (subscribers.length === 0) return { recipientCount: 0 }
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required to send Notes email')

  // Populate inline uploads and internal links once, within the publication transaction.
  const publishedNote = await payload.findByID({
    collection: 'notes', id: note.id, depth: 2, draft: false, overrideAccess: true, req,
  })
  const content = renderNoteEmailContent(publishedNote.body, getSiteURL())
  const resend = new Resend(process.env.RESEND_API_KEY)
  for (let index = 0; index < subscribers.length; index += EMAIL_BATCH_SIZE) {
    const batch = subscribers.slice(index, index + EMAIL_BATCH_SIZE).map((subscriber) => buildEmail(note, subscriber, content))
    const result = await resend.batch.send(batch, {
      headers: { 'Idempotency-Key': `note-${note.id}-${note.publishedAt || note.updatedAt}-${index / EMAIL_BATCH_SIZE}` },
    })
    if (result.error) throw new Error(result.error.message)
  }

  return { recipientCount: subscribers.length }
}

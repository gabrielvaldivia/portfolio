import type { Payload, PayloadRequest } from 'payload'
import { randomUUID } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { completeNewsletters, newsletterEnvironment, newsletterRows, type NewsletterDB } from './noteNewsletterQueue'
import { escapeHTML } from './noteContent'
import type { renderNoteEmailContent } from './noteEmailContent'
import { createSubscriptionToken, getSiteURL } from './noteSubscriptions'

const UNSUBSCRIBE_TTL_SECONDS = 60 * 60 * 24 * 365 * 10

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

export function buildNoteNewsletterEmail(note: NewsletterNote, subscriber: NewsletterSubscriber, content: ReturnType<typeof renderNoteEmailContent>) {
  const { siteURL, unsubscribeURL } = subscriptionLinks(subscriber.email)

  return {
    from: getSender(),
    headers: {
      'List-Unsubscribe': `<${unsubscribeURL}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><style>@media (min-width:810px){.note-email-content{padding:48px 40px!important}}</style></head><body style="margin:0;padding:0;font-family:Inter,-apple-system,BlinkMacSystemFont,Arial,Helvetica,sans-serif;font-size:18px;line-height:1.65"><div class="note-email-content" style="max-width:600px;margin:0 auto;padding:32px 20px"><h1 style="margin:0 0 24px;font-size:34px;line-height:1.15;font-weight:500;letter-spacing:-0.03em">${escapeHTML(note.title)}</h1>${content.html}<p style="margin:24px 0 0;font-size:13px;line-height:1.5;opacity:0.55">You subscribe to Gabriel Valdivia's notes at <a href="${escapeHTML(siteURL)}" style="color:inherit">gabrielvaldivia.com</a>. <a href="${escapeHTML(unsubscribeURL)}" style="color:inherit">Unsubscribe</a></p></div></body></html>`,
    replyTo: getReplyTo(),
    subject: note.title,
    text: `${note.title}\n\n${content.text}\n\nYou subscribe to Gabriel Valdivia's notes at gabrielvaldivia.com. Unsubscribe: ${unsubscribeURL}`,
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
      sort: 'id',
      where: { status: { equals: 'subscribed' } },
    })

    subscribers.push(...result.docs.map((subscriber) => ({ email: String(subscriber.email) })))
    if (!result.hasNextPage) break
    page += 1
  }

  return subscribers
}

export async function queuePublishedNoteNewsletter(note: NewsletterNote, payload: Payload, req?: PayloadRequest) {
  const transactionID = await req?.transactionID
  if (req && !transactionID) throw new Error('Newsletter queuing requires a publication transaction')
  const db = (transactionID ? payload.db.sessions?.[transactionID]?.db : payload.db.drizzle) as NewsletterDB | undefined
  if (!db) throw new Error('Newsletter publication transaction unavailable')
  const environment = newsletterEnvironment()
  const newsletterID = randomUUID()
  const created = newsletterRows(await db.execute(sql`
    INSERT INTO note_newsletters (id, note_id, environment) VALUES (${newsletterID}, ${note.id}, ${environment})
    ON CONFLICT (note_id, environment) DO NOTHING RETURNING id
  `))
  if (!created.length) return { queued: false, recipientCount: 0 }

  const subscribers = await getSubscribers(payload, req)
  if (subscribers.length) {
    // Freeze the first publication and recipient-specific links so multi-day
    // delivery and network retries use exactly the same content.
    const { renderNoteEmailContent } = await import('./noteEmailContent')
    const publishedNote = await payload.findByID({
      collection: 'notes', id: note.id, depth: 2, draft: false, overrideAccess: true, req,
    })
    const content = renderNoteEmailContent(publishedNote.body, getSiteURL())
    for (let index = 0; index < subscribers.length; index += 100) {
      const values = subscribers.slice(index, index + 100).map(subscriber => sql`(
        ${randomUUID()}, ${newsletterID}, ${subscriber.email},
        ${JSON.stringify(buildNoteNewsletterEmail(note, subscriber, content))}::jsonb
      )`)
      await db.execute(sql`
        INSERT INTO note_newsletter_deliveries (id, newsletter_id, email, message)
        VALUES ${sql.join(values, sql`, `)} ON CONFLICT (newsletter_id, email) DO NOTHING
      `)
    }
  }
  await completeNewsletters(db, environment)
  return { queued: true, recipientCount: subscribers.length }
}

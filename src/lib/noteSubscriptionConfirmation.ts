import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { Resend } from 'resend'
import { getSiteURL } from './noteSubscriptions'

export async function confirmNoteSubscription(payload: Payload, email: string) {
  const result = await payload.find({
    collection: 'note-subscribers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })
  const subscriber = result.docs[0]
  // Refreshing an already-used confirmation link must not send another email.
  if (subscriber?.status === 'subscribed') return subscriber

  const confirmedAt = subscriber?.confirmedAt || new Date().toISOString()
  const confirmed = subscriber
    ? await payload.update({
      collection: 'note-subscribers',
      id: subscriber.id,
      data: { confirmedAt, status: 'subscribed', unsubscribedAt: null },
      overrideAccess: true,
    })
    : await payload.create({
      collection: 'note-subscribers',
      data: { confirmedAt, email, source: 'confirmation-link', status: 'subscribed' },
      overrideAccess: true,
    })

  try {
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required for subscriber notifications')

    const local = process.env.NODE_ENV !== 'production'
    // Concurrent clicks see the same pending revision. Resend can deduplicate
    // their identical notifications, while a later resubscription gets a new key.
    const eventId = createHash('sha256')
      .update(`${confirmed.id}:${subscriber?.updatedAt || confirmed.createdAt}`)
      .digest('hex')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const notification = await resend.emails.send({
      from: process.env.NOTES_EMAIL_FROM || 'Gabriel Valdivia <notes@gabrielvaldivia.com>',
      to: process.env.NOTES_SUBSCRIBER_EMAIL_TO || process.env.CONTACT_EMAIL_TO || 'gabe@valdivia.works',
      replyTo: email,
      subject: `${local ? '[Local preview] ' : ''}New Notes subscriber: ${email}`,
      text: [
        `${email} confirmed their subscription to Notes.`,
        '',
        `Subscriber: ${getSiteURL()}/admin/collections/note-subscribers/${encodeURIComponent(String(confirmed.id))}`,
        '',
        'You can reply directly to this email to get in touch.',
      ].join('\n'),
    }, {
      idempotencyKey: `notes-subscriber:${local ? 'local' : 'production'}:${eventId}`,
    })
    if (notification.error || !notification.data?.id) {
      throw new Error(notification.error?.message || 'Subscriber notification was not accepted')
    }
  } catch (error) {
    // The subscription is already saved; an owner notification must not undo it.
    console.error('Notes subscriber notification failed:', error)
  }

  return confirmed
}

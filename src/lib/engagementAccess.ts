import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { getPayloadSecret } from './payloadSecret'

export const ENGAGEMENT_ACCESS_COOKIE = 'gv_engagement_access'
export const ENGAGEMENT_ACCESS_MAX_AGE = 60 * 60 * 24

export function normalizeEngagementEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function isValidEngagementEmail(email: string) {
  return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)
}

function sign(value: string) {
  return createHmac('sha256', getPayloadSecret())
    .update(`engagement-access:${value}`)
    .digest('hex')
}

// The cookie contains no email address or other visitor information.
export function createEngagementAccessToken(now = Date.now()) {
  const expires = Math.floor(now / 1_000) + ENGAGEMENT_ACCESS_MAX_AGE
  const value = `${expires}.${randomUUID()}`
  return `${value}.${sign(value)}`
}

export function hasEngagementAccess(token: string | undefined, now = Date.now()) {
  if (!token || token.length > 160) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [expires, nonce, signature] = parts
  if (!/^\d{10}$/.test(expires) || !/^[a-f0-9-]{36}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false
  const remaining = Number(expires) - Math.floor(now / 1_000)
  if (remaining <= 0 || remaining > ENGAGEMENT_ACCESS_MAX_AGE) return false
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(`${expires}.${nonce}`), 'hex'))
}

export function engagementNotification(email: string, now = new Date()) {
  const local = process.env.NODE_ENV !== 'production'
  const day = now.toISOString().slice(0, 10)
  const viewerHash = sign(`notification:${email}`)
  const origin = (process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.gabrielvaldivia.com').replace(/\/+$/, '')

  return {
    // Keep the payload stable so retries within a UTC day can be deduplicated by Resend.
    idempotencyKey: `engagement-view:v2:${local ? 'local' : 'production'}:${day}:${viewerHash}`,
    message: {
      from: process.env.ENGAGEMENT_EMAIL_FROM || 'Portfolio <onboarding@resend.dev>',
      to: process.env.ENGAGEMENT_EMAIL_TO || process.env.CONTACT_EMAIL_TO || 'gabe@valdivia.works',
      replyTo: email,
      subject: `${local ? '[Local preview] ' : ''}New engagement models viewer: ${email}`,
      text: [
        `${email} entered their email to view your engagement models.`,
        '',
        `Page: ${origin}/working-together`,
        `Date: ${day} (UTC)`,
        '',
        'You can reply directly to this email to follow up.',
        'This is the address the visitor provided; ownership has not been verified.',
      ].join('\n'),
    },
  }
}

import { createHmac, timingSafeEqual } from 'node:crypto'
import { getPayloadSecret } from './payloadSecret'

export type SubscriptionTokenPurpose = 'confirm' | 'unsubscribe'

type SubscriptionTokenPayload = {
  email: string
  exp: number
  purpose: SubscriptionTokenPurpose
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeSubscriberEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function isValidSubscriberEmail(email: string) {
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

export function getSiteURL() {
  return (process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.gabrielvaldivia.com').replace(/\/+$/, '')
}

function sign(payload: string) {
  return createHmac('sha256', getPayloadSecret()).update(payload).digest('base64url')
}

export function createSubscriptionToken(
  email: string,
  purpose: SubscriptionTokenPurpose,
  ttlSeconds: number,
) {
  const payload = Buffer.from(JSON.stringify({
    email: normalizeSubscriberEmail(email),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    purpose,
  } satisfies SubscriptionTokenPayload)).toString('base64url')

  return `${payload}.${sign(payload)}`
}

export function verifySubscriptionToken(token: string, purpose: SubscriptionTokenPurpose) {
  const [payload, signature, ...rest] = token.split('.')
  if (!payload || !signature || rest.length > 0) return null

  try {
    const actual = Buffer.from(signature, 'base64url')
    const expected = Buffer.from(sign(payload), 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SubscriptionTokenPayload
    const email = normalizeSubscriberEmail(parsed.email)
    if (
      parsed.purpose !== purpose ||
      !isValidSubscriberEmail(email) ||
      !Number.isFinite(parsed.exp) ||
      parsed.exp < Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return { email }
  } catch {
    return null
  }
}

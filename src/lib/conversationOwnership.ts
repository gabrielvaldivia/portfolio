import { createHash, randomUUID, timingSafeEqual } from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'
import { getPayloadSecret } from './payloadSecret'

const COOKIE_NAME = 'gv_chat_owner'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type ConversationOwner = {
  hash: string
  id: string
  shouldSetCookie: boolean
}

function hashOwner(id: string) {
  return createHash('sha256').update(`${getPayloadSecret()}:${id}`).digest('hex')
}

export function getConversationOwner(req: NextRequest, createIfMissing = false): ConversationOwner | null {
  const existing = req.cookies.get(COOKIE_NAME)?.value
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
    return { id: existing, hash: hashOwner(existing), shouldSetCookie: false }
  }

  if (!createIfMissing) return null
  const id = randomUUID()
  return { id, hash: hashOwner(id), shouldSetCookie: true }
}

export function applyConversationOwnerCookie(response: NextResponse, owner: ConversationOwner) {
  if (!owner.shouldSetCookie) return response

  response.cookies.set(COOKIE_NAME, owner.id, {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export function conversationOwnerMatches(expected: unknown, actual: string) {
  if (typeof expected !== 'string' || expected.length !== actual.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
}

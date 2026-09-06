import { createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadSecret } from './payloadSecret'

const COOKIE_NAME = 'gv_module_liker'
export type AnonymousVisitor = { id: string; shouldSetCookie: boolean }

export function getVisitor(req: NextRequest): AnonymousVisitor {
  const existing = req.cookies.get(COOKIE_NAME)?.value
  return existing && /^[a-f0-9-]{36}$/i.test(existing)
    ? { id: existing, shouldSetCookie: false }
    : { id: randomUUID(), shouldSetCookie: true }
}

export function getVisitorHash(visitorId: string) {
  return createHash('sha256').update(`${getPayloadSecret()}:${visitorId}`).digest('hex')
}

export function withVisitorCookie<T>(data: T, visitor: AnonymousVisitor, init?: ResponseInit) {
  const response = NextResponse.json(data, init)
  // Responses include browser-specific ownership; neither CDN nor browser should reuse them.
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Vary', 'Cookie')
  if (visitor.shouldSetCookie) {
    response.cookies.set(COOKIE_NAME, visitor.id, {
      httpOnly: true, maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }
  return response
}

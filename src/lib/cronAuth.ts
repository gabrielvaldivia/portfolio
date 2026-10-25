import { createHash, timingSafeEqual } from 'node:crypto'

/** Constant-time check of the scheduler's bearer token. */
export function hasCronAuthorization(headers: Headers, secret: string | undefined) {
  if (!secret) return false
  // Hash both sides so the comparison takes the same time whatever their lengths.
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(headers.get('authorization') || ''), digest(`Bearer ${secret}`))
}

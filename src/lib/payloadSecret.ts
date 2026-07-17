const LOCAL_PAYLOAD_SECRET = 'local-development-only-payload-secret'
const NEXT_PRODUCTION_BUILD_PHASE = 'phase-production-build'

export function getPayloadSecret() {
  const secret = process.env.PAYLOAD_SECRET?.trim()

  if (secret) return secret

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== NEXT_PRODUCTION_BUILD_PHASE
  ) {
    throw new Error('PAYLOAD_SECRET is required in production')
  }

  return LOCAL_PAYLOAD_SECRET
}

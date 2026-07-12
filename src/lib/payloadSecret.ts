const LOCAL_PAYLOAD_SECRET = 'local-development-only-payload-secret'

export function getPayloadSecret() {
  const secret = process.env.PAYLOAD_SECRET?.trim()

  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('PAYLOAD_SECRET is required in production')
  }

  return LOCAL_PAYLOAD_SECRET
}

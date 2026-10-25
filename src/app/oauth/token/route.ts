import { getPayload } from '@/lib/payload'
import {
  clientFingerprint,
  issueTokens,
  OAuthError,
  oauthErrorResponse,
  oauthJSON,
  oauthPreflight,
  readAuthorizationCode,
  readClient,
  readOAuthBody,
  readRefreshToken,
} from '@/lib/mcpOAuth'
import { consumeAuthorizationCode, loadTokenUser } from '@/lib/mcpOAuthServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await readOAuthBody(request)
    const clientId = typeof body.client_id === 'string' ? body.client_id : ''
    readClient(clientId)
    const payload = await getPayload()

    if (body.grant_type === 'authorization_code') {
      const code = readAuthorizationCode(body.code, {
        clientId,
        redirectUri: typeof body.redirect_uri === 'string' ? body.redirect_uri : '',
        verifier: typeof body.code_verifier === 'string' ? body.code_verifier : '',
      })
      await consumeAuthorizationCode(payload, code.jti)
      await loadTokenUser(payload, code.sub, code.ver)
      return oauthJSON(issueTokens({ sub: code.sub, client: clientFingerprint(clientId), resource: code.resource, ver: code.ver }))
    }

    if (body.grant_type === 'refresh_token') {
      const grant = readRefreshToken(body.refresh_token, clientId)
      await loadTokenUser(payload, grant.sub, grant.ver)
      return oauthJSON(issueTokens(grant))
    }

    throw new OAuthError('unsupported_grant_type', 'Use authorization_code or refresh_token.')
  } catch (error) {
    return oauthErrorResponse(error)
  }
}

export function OPTIONS() {
  return oauthPreflight()
}

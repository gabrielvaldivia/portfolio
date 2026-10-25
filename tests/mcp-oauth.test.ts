import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { before, test } from 'node:test'

let oauth: typeof import('../src/lib/mcpOAuth')
const verifier = 'v'.repeat(43) + 'erifier-0123456789'
const challenge = createHash('sha256').update(verifier).digest('base64url')
const user = { id: 7, hash: 'password-hash', salt: 'salt' }

before(async () => {
  process.env.PAYLOAD_SECRET ||= 'mcp-oauth-test-secret'
  process.env.NEXT_PUBLIC_SERVER_URL = 'https://portfolio.example'
  oauth = await import('../src/lib/mcpOAuth')
})

function authorize(clientId: string, overrides: Record<string, string> = {}) {
  return oauth.parseAuthorizationRequest(new URLSearchParams({
    client_id: clientId, redirect_uri: 'https://claude.ai/api/mcp/auth_callback', response_type: 'code',
    code_challenge: challenge, code_challenge_method: 'S256', state: 'xyz', ...overrides,
  }))
}

test('metadata points clients at this site', () => {
  assert.equal(oauth.protectedResourceMetadata().resource, 'https://portfolio.example/api/mcp')
  assert.deepEqual(oauth.protectedResourceMetadata().authorization_servers, ['https://portfolio.example'])
  assert.equal(oauth.authorizationServerMetadata().token_endpoint, 'https://portfolio.example/oauth/token')
})

test('registration accepts https and loopback redirects only', () => {
  const client = oauth.registerClient({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback', 'http://localhost:4567/callback'], client_name: 'Claude' })
  assert.equal(client.client_name, 'Claude')
  assert.deepEqual(oauth.readClient(client.client_id).redirectUris, client.redirect_uris)
  assert.throws(() => oauth.registerClient({ redirect_uris: ['http://evil.example/cb'] }), /redirect/)
  assert.throws(() => oauth.readClient(client.client_id.replace(/.$/, 'x')), /Unknown client/)
})

test('a full sign-in exchanges a code for tokens once PKCE matches', () => {
  const { client_id } = oauth.registerClient({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] })
  const request = authorize(client_id)
  const code = oauth.issueAuthorizationCode(request, user)
  const redirect = new URL(oauth.redirectWith(request, { code }))
  assert.equal(redirect.searchParams.get('state'), 'xyz')
  assert.equal(redirect.searchParams.get('iss'), 'https://portfolio.example')

  const claims = oauth.readAuthorizationCode(code, { clientId: client_id, redirectUri: request.redirectUri, verifier })
  assert.equal(claims.sub, 7)
  assert.throws(() => oauth.readAuthorizationCode(code, { clientId: client_id, redirectUri: request.redirectUri, verifier: 'w'.repeat(43) }), /verifier/)
  const other = oauth.registerClient({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }).client_id
  assert.throws(() => oauth.readAuthorizationCode(code, { clientId: other, redirectUri: request.redirectUri, verifier }), /another client/)

  const tokens = oauth.issueTokens({ sub: claims.sub, client: oauth.clientFingerprint(client_id), resource: claims.resource, ver: claims.ver })
  assert.equal(oauth.readAccessToken(`Bearer ${tokens.access_token}`)?.sub, 7)
  assert.equal(oauth.readAccessToken(`Bearer ${tokens.refresh_token}`), null, 'refresh tokens are not access tokens')
  assert.equal(oauth.readAccessToken(`Bearer ${tokens.access_token}x`), null)
  assert.equal(oauth.readRefreshToken(tokens.refresh_token, client_id).sub, 7)
  assert.throws(() => oauth.readRefreshToken(tokens.refresh_token, other), /refresh token/)
})

test('authorization requests must use registered redirects, PKCE, and this resource', () => {
  const { client_id } = oauth.registerClient({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] })
  assert.throws(() => authorize(client_id, { redirect_uri: 'https://evil.example/cb' }), /not registered/)
  assert.throws(() => authorize(client_id, { code_challenge_method: 'plain' }), /PKCE/)
  assert.throws(() => authorize(client_id, { resource: 'https://other.example/api/mcp' }), /resource/)
  assert.equal(authorize(client_id, { resource: 'https://portfolio.example/api/mcp/' }).resource, 'https://portfolio.example/api/mcp')
})

test('changing the password changes the token version', () => {
  assert.notEqual(oauth.userTokenVersion(user), oauth.userTokenVersion({ ...user, hash: 'new-hash' }))
})

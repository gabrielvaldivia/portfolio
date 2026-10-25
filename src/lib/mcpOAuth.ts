import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { getPayloadSecret } from './payloadSecret'

/**
 * OAuth 2.1 for the MCP endpoint, as the MCP authorization spec describes:
 * clients discover this server, register themselves, send the editor through
 * a browser sign-in with PKCE, and then call /api/mcp with bearer tokens.
 *
 * Every artifact (client IDs, codes, tokens) is a signed, self-describing
 * string, so nothing but one-time code use needs storage. Tokens carry a
 * fingerprint of the editor's password hash: changing the password signs every
 * MCP client out. Rotating PAYLOAD_SECRET revokes everything.
 */

export const MCP_PATH = '/api/mcp'
const CODE_TTL_SECONDS = 120
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30
const MAX_REDIRECT_URIS = 10
const MAX_TOKEN_LENGTH = 8_192

type TokenKind = 'client' | 'code' | 'access' | 'refresh'

export type OAuthClient = { redirectUris: string[]; name: string; id?: string }
type CodeClaims = { sub: number | string; client: string; redirectUri: string; challenge: string; resource: string; ver: string; jti: string }
type GrantClaims = { sub: number | string; client: string; resource: string; ver: string }

export class OAuthError extends Error {
  constructor(readonly error: string, description: string, readonly status = 400) {
    super(description)
  }
}

export function getOAuthOrigin() {
  const fallback = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.gabrielvaldivia.com'
  return (process.env.NEXT_PUBLIC_SERVER_URL || fallback).replace(/\/+$/, '')
}

export function getMcpResource() {
  return `${getOAuthOrigin()}${MCP_PATH}`
}

function signature(kind: TokenKind, body: string) {
  return createHmac('sha256', getPayloadSecret()).update(`mcp-oauth:${kind}:${body}`).digest('base64url')
}

function seal(kind: TokenKind, claims: object, ttlSeconds?: number) {
  const body = Buffer.from(JSON.stringify({
    ...claims,
    ...(ttlSeconds ? { exp: Math.floor(Date.now() / 1000) + ttlSeconds } : {}),
  })).toString('base64url')
  return `${body}.${signature(kind, body)}`
}

function open<T>(kind: TokenKind, token: unknown): T | null {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return null
  const [body, sig, ...rest] = token.split('.')
  if (!body || !sig || rest.length) return null
  const expected = Buffer.from(signature(kind, body))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof claims !== 'object' || !claims) return null
    if (typeof claims.exp === 'number' && claims.exp < Date.now() / 1000) return null
    return claims as T
  } catch {
    return null
  }
}

const hash = (value: string) => createHash('sha256').update(value).digest('base64url')

/** A stable short fingerprint of a client ID, so codes and tokens stay small. */
export const clientFingerprint = (clientId: string) => hash(clientId).slice(0, 22)

/** Changes whenever the editor's password does, which invalidates their tokens. */
export function userTokenVersion(user: { id: number | string; hash?: unknown; salt?: unknown }) {
  return hash(`${user.id}:${typeof user.hash === 'string' ? user.hash : ''}:${typeof user.salt === 'string' ? user.salt : ''}`).slice(0, 16)
}

function isAllowedRedirectUri(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.hash || url.username || url.password) return false
  if (url.protocol === 'https:') return true
  // Native and CLI clients receive the code on a loopback port.
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
}

/** RFC 7591 dynamic registration, stateless: the client ID is the signed registration. */
export function registerClient(input: Record<string, unknown>) {
  const redirectUris = Array.isArray(input.redirect_uris) ? input.redirect_uris : []
  if (!redirectUris.length || redirectUris.length > MAX_REDIRECT_URIS
    || !redirectUris.every((uri) => typeof uri === 'string' && uri.length <= 2_000 && isAllowedRedirectUri(uri))) {
    throw new OAuthError('invalid_redirect_uri', 'Provide 1 to 10 https or loopback redirect URIs.')
  }
  if (input.token_endpoint_auth_method && input.token_endpoint_auth_method !== 'none') {
    throw new OAuthError('invalid_client_metadata', 'Only public clients using PKCE are supported.')
  }
  const name = typeof input.client_name === 'string' && input.client_name.trim()
    ? input.client_name.trim().slice(0, 100)
    : new URL(redirectUris[0] as string).host
  // A random ID keeps separate registrations distinct even with identical metadata.
  const client: OAuthClient = { redirectUris: redirectUris as string[], name, id: randomUUID() }
  return {
    client_id: seal('client', client),
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: name,
    redirect_uris: client.redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }
}

export function readClient(clientId: unknown) {
  const client = open<OAuthClient>('client', clientId)
  if (!client || !Array.isArray(client.redirectUris)) throw new OAuthError('invalid_client', 'Unknown client.', 401)
  return client
}

export type AuthorizationRequest = {
  clientId: string
  client: OAuthClient
  redirectUri: string
  codeChallenge: string
  state: string | null
  resource: string
}

/** Validates an authorization request; errors before the redirect URI is trusted are shown, not redirected. */
export function parseAuthorizationRequest(params: URLSearchParams): AuthorizationRequest {
  const clientId = params.get('client_id') || ''
  const client = readClient(clientId)
  const redirectUri = params.get('redirect_uri') || (client.redirectUris.length === 1 ? client.redirectUris[0] : '')
  if (!client.redirectUris.includes(redirectUri)) throw new OAuthError('invalid_request', 'The redirect URI was not registered for this client.')
  if (params.get('response_type') !== 'code') throw new OAuthError('unsupported_response_type', 'Only the authorization code flow is supported.')
  const codeChallenge = params.get('code_challenge') || ''
  if (params.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
    throw new OAuthError('invalid_request', 'PKCE with S256 is required.')
  }
  const resource = params.get('resource') || getMcpResource()
  if (resource.replace(/\/+$/, '') !== getMcpResource()) throw new OAuthError('invalid_target', 'Unknown resource.')
  const state = params.get('state')
  return { clientId, client, redirectUri, codeChallenge, state: state ? state.slice(0, 1_000) : null, resource: getMcpResource() }
}

export function redirectWith(request: Pick<AuthorizationRequest, 'redirectUri' | 'state'>, values: Record<string, string>) {
  const url = new URL(request.redirectUri)
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
  if (request.state) url.searchParams.set('state', request.state)
  url.searchParams.set('iss', getOAuthOrigin())
  return url.toString()
}

export function issueAuthorizationCode(request: AuthorizationRequest, user: { id: number | string; hash?: unknown; salt?: unknown }) {
  const claims: CodeClaims = {
    sub: user.id,
    client: clientFingerprint(request.clientId),
    redirectUri: request.redirectUri,
    challenge: request.codeChallenge,
    resource: request.resource,
    ver: userTokenVersion(user),
    jti: randomUUID(),
  }
  return seal('code', claims, CODE_TTL_SECONDS)
}

export function readAuthorizationCode(code: unknown, { clientId, redirectUri, verifier }: { clientId: string; redirectUri: string; verifier: string }) {
  const claims = open<CodeClaims>('code', code)
  if (!claims) throw new OAuthError('invalid_grant', 'The authorization code is invalid or expired.')
  if (claims.client !== clientFingerprint(clientId)) throw new OAuthError('invalid_grant', 'The code was issued to another client.')
  if (claims.redirectUri !== redirectUri) throw new OAuthError('invalid_grant', 'The redirect URI does not match.')
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || hash(verifier) !== claims.challenge) {
    throw new OAuthError('invalid_grant', 'The code verifier does not match.')
  }
  return claims
}

export function issueTokens(grant: GrantClaims) {
  return {
    access_token: seal('access', grant, ACCESS_TOKEN_TTL_SECONDS),
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: seal('refresh', grant, REFRESH_TOKEN_TTL_SECONDS),
    scope: 'mcp',
  }
}

export function readRefreshToken(token: unknown, clientId: string) {
  const claims = open<GrantClaims>('refresh', token)
  if (!claims || claims.client !== clientFingerprint(clientId)) throw new OAuthError('invalid_grant', 'The refresh token is invalid or expired.')
  return claims
}

export function readAccessToken(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null
  const claims = open<GrantClaims>('access', authorization.slice('Bearer '.length).trim())
  return claims && claims.resource === getMcpResource() ? claims : null
}

export function authorizationServerMetadata() {
  const origin = getOAuthOrigin()
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
  }
}

export function protectedResourceMetadata() {
  return {
    resource: getMcpResource(),
    authorization_servers: [getOAuthOrigin()],
    bearer_methods_supported: ['header'],
    scopes_supported: ['mcp'],
    resource_name: 'Gabriel Valdivia Portfolio',
  }
}

function corsHeaders(init?: HeadersInit) {
  const headers = new Headers(init)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Protocol-Version')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store')
  return headers
}

/** Public metadata and token endpoints are called by browser-based clients too. */
export function oauthJSON(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: corsHeaders(init.headers) })
}

export function oauthPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export function oauthErrorResponse(error: unknown) {
  if (error instanceof OAuthError) {
    return oauthJSON({ error: error.error, error_description: error.message }, { status: error.status })
  }
  console.error('MCP OAuth request failed:', error instanceof Error ? error.message : error)
  return oauthJSON({ error: 'server_error', error_description: 'Something went wrong.' }, { status: 500 })
}

export async function readOAuthBody(request: Request) {
  const type = request.headers.get('content-type') || ''
  if (Number(request.headers.get('content-length') || 0) > 32_000) throw new OAuthError('invalid_request', 'Request body is too large.')
  if (type.includes('application/json')) {
    const json = await request.json().catch(() => null)
    if (!json || typeof json !== 'object') throw new OAuthError('invalid_request', 'Invalid JSON body.')
    return json as Record<string, unknown>
  }
  const form = await request.formData().catch(() => null)
  if (!form) throw new OAuthError('invalid_request', 'Expected a form or JSON body.')
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]))
}

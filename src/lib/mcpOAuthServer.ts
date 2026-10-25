import { createHash } from 'node:crypto'
import { sql } from '@payloadcms/db-postgres'
import { UnauthorizedError, type Payload, type PayloadRequest, type TypedUser } from 'payload'
import { OAuthError, readAccessToken, userTokenVersion } from './mcpOAuth'

type EditorRecord = { id: number | string; email?: string | null; hash?: unknown; salt?: unknown }

/** Loads the editor a code or token was issued to, rejecting it once their password changes. */
export async function loadTokenUser(payload: Payload, id: number | string, version: string) {
  const user = await payload.findByID({
    collection: 'users', id, depth: 0, overrideAccess: true, showHiddenFields: true, disableErrors: true,
  }) as EditorRecord | null
  if (!user || userTokenVersion(user) !== version) throw new OAuthError('invalid_grant', 'Sign in again to reconnect.')
  return user
}

/**
 * Authorization codes may be exchanged once. The rate-limit table already has
 * a unique key and three-day cleanup, so it doubles as the replay ledger.
 */
export async function consumeAuthorizationCode(payload: Payload, jti: string) {
  const key = createHash('sha256').update(`mcp-oauth-code:${jti}`).digest('hex')
  const result = await payload.db.drizzle.execute(sql`
    INSERT INTO "chat_rate_limits" ("key_hash", "window_started_at", "request_count")
    VALUES (${key}, now(), 1)
    ON CONFLICT ("key_hash") DO NOTHING
    RETURNING "key_hash"
  `)
  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows || []
  if (!rows.length) throw new OAuthError('invalid_grant', 'The authorization code was already used.')
}

type PluginEntity = { enabled: boolean | Partial<Record<'find' | 'create' | 'update' | 'delete', boolean>> }
type GrantOptions = {
  collections: Record<string, PluginEntity>
  globals: Record<string, PluginEntity>
  toolNames: string[]
}

const camelCase = (value: string) =>
  value.replace(/[-_\s]+(.)?/g, (_, chr: string | undefined) => (chr ? chr.toUpperCase() : '')).replace(/^(.)/, (chr) => chr.toLowerCase())

function grantedOperations(entity: PluginEntity, operations: readonly string[]) {
  return Object.fromEntries(operations.map((operation) => [
    operation,
    entity.enabled === true || (typeof entity.enabled === 'object' && entity.enabled[operation as 'find'] === true),
  ]))
}

/**
 * Replaces the plugin's API-key lookup: a valid OAuth access token stands for
 * the signed-in editor, who gets every capability the plugin config exposes.
 */
export function createMcpOAuthAuthenticator({ collections, globals, toolNames }: GrantOptions) {
  const capabilities = {
    ...Object.fromEntries(Object.entries(collections).map(([slug, entity]) =>
      [camelCase(slug), grantedOperations(entity, ['find', 'create', 'update', 'delete'])])),
    ...Object.fromEntries(Object.entries(globals).map(([slug, entity]) =>
      [camelCase(slug), grantedOperations(entity, ['find', 'update'])])),
    'payload-mcp-tool': Object.fromEntries(toolNames.map((name) => [camelCase(name), true])),
  }

  return async (req: PayloadRequest) => {
    const claims = readAccessToken(req.headers.get('authorization'))
    if (!claims) throw new UnauthorizedError()
    let user: EditorRecord
    try {
      user = await loadTokenUser(req.payload, claims.sub, claims.ver)
    } catch {
      throw new UnauthorizedError()
    }
    const { hash: _hash, salt: _salt, ...publicUser } = user
    return { ...capabilities, user: { ...publicUser, collection: 'users' } as unknown as TypedUser }
  }
}

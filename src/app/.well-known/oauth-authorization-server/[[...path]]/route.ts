import { oauthPreflight, authorizationServerMetadata, oauthJSON } from '@/lib/mcpOAuth'

// RFC 8414. MCP clients may append the resource path, so any suffix answers.
export function GET() {
  return oauthJSON(authorizationServerMetadata(), { headers: { 'Cache-Control': 'public, max-age=3600' } })
}

export function OPTIONS() {
  return oauthPreflight()
}

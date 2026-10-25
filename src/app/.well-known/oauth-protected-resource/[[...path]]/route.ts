import { oauthPreflight, oauthJSON, protectedResourceMetadata } from '@/lib/mcpOAuth'

// RFC 9728. Clients request it at the root or with the /api/mcp suffix.
export function GET() {
  return oauthJSON(protectedResourceMetadata(), { headers: { 'Cache-Control': 'public, max-age=3600' } })
}

export function OPTIONS() {
  return oauthPreflight()
}

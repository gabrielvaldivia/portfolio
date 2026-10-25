import { oauthPreflight, oauthErrorResponse, oauthJSON, readOAuthBody, registerClient } from '@/lib/mcpOAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    return oauthJSON(registerClient(await readOAuthBody(request)), { status: 201 })
  } catch (error) {
    return oauthErrorResponse(error)
  }
}

export function OPTIONS() {
  return oauthPreflight()
}

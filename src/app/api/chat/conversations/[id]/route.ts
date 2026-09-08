import { getPayload } from '@/lib/payload'
import { normalizeConversationMessages } from '@/lib/chatMessages'
import {
  conversationOwnerMatches,
  getConversationOwner,
} from '@/lib/conversationOwnership'
import { toPublicConversation } from '@/lib/publicConversation'
import { assertSameOrigin, readJSONBody, requestErrorResponse } from '@/lib/httpRequest'
import { NextRequest } from 'next/server'

const MAX_BODY_BYTES = 80_000

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload()
  try {
    const doc = await payload.findByID({
      collection: 'conversations',
      id,
      overrideAccess: true,
    })
    return Response.json(toPublicConversation(doc), {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    })
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    assertSameOrigin(req)
    body = await readJSONBody(req, { maxBytes: MAX_BODY_BYTES })
  } catch (error) {
    return requestErrorResponse(error) || Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const messages = normalizeConversationMessages(body.messages)

  if (!messages) {
    return Response.json({ error: 'Valid messages are required' }, { status: 400 })
  }

  const payload = await getPayload()
  try {
    const existing = await payload.findByID({
      collection: 'conversations',
      id,
      depth: 0,
      overrideAccess: true,
    })
    const owner = getConversationOwner(req)
    if (!owner || !conversationOwnerMatches((existing as any).ownerHash, owner.hash)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const doc = await payload.update({
      collection: 'conversations',
      id,
      data: { messages },
      overrideAccess: true,
    })

    return Response.json(toPublicConversation(doc))
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

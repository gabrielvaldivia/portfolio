import { getPayload } from '@/lib/payload'
import { sendNotification } from '../../notify/send'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload()
  try {
    const doc = await payload.findByID({ collection: 'conversations', id })
    return Response.json(doc)
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { messages } = await req.json()

  if (!messages) {
    return Response.json({ error: 'messages required' }, { status: 400 })
  }

  const payload = await getPayload()
  try {
    const doc = await payload.update({
      collection: 'conversations',
      id,
      data: { messages },
    })

    // Send email notification in the background
    const title = (doc as any).title || ''
    sendNotification({ conversationId: id, title, messages }).catch(() => {})

    return Response.json(doc)
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

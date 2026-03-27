import { getPayload } from '@/lib/payload'

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
    return Response.json(doc)
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

import { getPayload } from '@/lib/payload'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload()
  try {
    const doc = await payload.findByID({
      collection: 'conversations',
      id,
      depth: 0,
      overrideAccess: true,
      select: {
        id: true,
        title: true,
        location: true,
        latitude: true,
        longitude: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return Response.json(doc, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
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
      overrideAccess: true,
      data: { messages },
    })


    return Response.json({ id: doc.id })
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}

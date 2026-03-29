import { getPayload } from '@/lib/payload'

export async function GET() {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'conversations',
    sort: '-updatedAt',
    limit: 50,
    depth: 0,
  })
  return Response.json(result.docs)
}

export async function POST(req: Request) {
  const { title, location, messages } = await req.json()

  if (!title || !messages) {
    return Response.json({ error: 'title and messages required' }, { status: 400 })
  }

  const payload = await getPayload()
  const doc = await payload.create({
    collection: 'conversations',
    data: { title, location: location || '', messages },
  })

  return Response.json(doc)
}

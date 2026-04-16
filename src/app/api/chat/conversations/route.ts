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

  const rawLat = req.headers.get('x-vercel-ip-latitude')
  const rawLng = req.headers.get('x-vercel-ip-longitude')
  const latitude = rawLat ? Number(rawLat) : null
  const longitude = rawLng ? Number(rawLng) : null

  const payload = await getPayload()
  const doc = await payload.create({
    collection: 'conversations',
    data: {
      title,
      location: location || '',
      messages,
      ...(Number.isFinite(latitude) && latitude !== null ? { latitude } : {}),
      ...(Number.isFinite(longitude) && longitude !== null ? { longitude } : {}),
    },
  })

  return Response.json(doc)
}

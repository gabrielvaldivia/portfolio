import { createNoteOpenGraphImage } from '@/lib/noteOpenGraph'
import { getPublishedNoteTitleBySlug } from '@/lib/queries'

// Payload and the bundled font use Node.js, not the Edge runtime.
export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const title = await getPublishedNoteTitleBySlug(slug)
  if (!title) return new Response('Note not found', { status: 404 })

  return createNoteOpenGraphImage(title)
}

import { NoteArticle } from '@/components/NoteArticle'
import { NotePreviewToolbar } from '@/components/NotePreviewToolbar'
import { getNotePreview } from '@/lib/notePreview'
import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function NotePreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const preview = await getNotePreview(token, getPayload)
  if (!preview) notFound()

  const expiresAt = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(preview.expiresAt))

  return (
    <>
      <NotePreviewToolbar expiresAt={expiresAt} />
      <main className="pt-12 tablet:pt-20">
        <NoteArticle note={preview.note} />
      </main>
    </>
  )
}

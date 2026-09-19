import { NoteArticle } from '@/components/NoteArticle'
import { NotePreviewToolbar } from '@/components/NotePreviewToolbar'
import { getNotePreview } from '@/lib/notePreview'
import { getPayload } from '@/lib/payload'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

export const dynamic = 'force-dynamic'

type NotePreviewPageProps = { params: Promise<{ token: string }> }

const loadNotePreview = cache((token: string) => getNotePreview(token, getPayload))

export async function generateMetadata({ params }: NotePreviewPageProps): Promise<Metadata> {
  const { token } = await params
  const preview = await loadNotePreview(token)
  if (!preview) notFound()

  const title = preview.note.title || 'Untitled note'

  return {
    title: `${title} — Gabriel Valdivia`,
    openGraph: { title, type: 'article', siteName: 'Gabriel Valdivia' },
    twitter: { card: 'summary', title },
  }
}

export default async function NotePreviewPage({ params }: NotePreviewPageProps) {
  const { token } = await params
  const preview = await loadNotePreview(token)
  if (!preview) notFound()

  const expiresAt = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(preview.expiresAt))

  return (
    <>
      <NotePreviewToolbar editURL={preview.editURL} expiresAt={expiresAt} />
      <main className="pt-12 tablet:pt-20">
        <NoteArticle note={preview.note} />
      </main>
    </>
  )
}

import { Container } from '@/components/Container'
import { RichText } from '@/components/RichText'
import { NoteHighlights } from '@/components/NoteHighlights'
import { getNoteHighlightText } from '@/lib/noteHighlightAnchors'
import { highlightTextVersion } from '@/lib/noteHighlightStore'
import { getNoteLikeTargetId } from '@/lib/moduleLikes'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNoteBySlug, getPublishedNoteSlugs, getReadNextNotes } from '@/lib/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

type NotePageProps = {
  params: Promise<{ slug: string }>
}

const noteDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

function formatNoteDate(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : noteDateFormatter.format(date)
}

export async function generateStaticParams() {
  try {
    const slugs = await getPublishedNoteSlugs()
    return slugs.map((slug) => ({ slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params
  const note = await getPublishedNoteBySlug(slug)
  if (!note) return {}

  const metaImage = typeof note.meta?.image === 'object' ? note.meta.image : undefined
  const coverImage = typeof note.coverImage === 'object' ? note.coverImage : undefined

  return buildPageMetadata(
    {
      meta: {
        title: note.meta?.title || note.title,
        description: note.meta?.description || note.excerpt,
        image: metaImage || coverImage,
      },
    },
    {
      fallbackTitle: note.title,
      fallbackDescription: note.excerpt || '',
    },
  )
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = await getPublishedNoteBySlug(slug)
  if (!note) notFound()

  const coverImage = typeof note.coverImage === 'object' ? note.coverImage : null
  const noteDate = formatNoteDate(note.publishedAt || note.createdAt)
  const readNextNotes = await getReadNextNotes(note.id, note.publishedAt)

  return (
    <article className="note-page pb-20 text-content">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <header className="flex flex-col gap-4 pb-12 tablet:pb-16">
            <h1 className="max-w-[1100px] text-balance text-[40px] leading-[1.05] tablet:text-[64px]">
              {note.title}
            </h1>
            {noteDate ? <p className="text-[16px] text-muted opacity-60 tablet:text-[18px]">{noteDate}</p> : null}
          </header>
        </div>

        {coverImage?.url ? (
          <figure className="mb-12 overflow-hidden rounded-[16px] bg-background-alt tablet:mb-16">
            <Image
              alt={coverImage.alt || ''}
              className="h-auto w-full"
              height={coverImage.height || 900}
              sizes="(max-width: 809px) calc(100vw - 40px), (max-width: 1479px) calc(100vw - 80px), 1400px"
              src={coverImage.url}
              width={coverImage.width || 1600}
            />
          </figure>
        ) : null}

        <div className="longform-body mx-auto max-w-[760px] [&_.rich-text_h2]:mb-8 [&_.rich-text_h2]:pb-4 [&_.rich-text_h2]:pt-16 [&_.rich-text_h3]:mb-6 [&_.rich-text_h3]:pb-4 [&_.rich-text_h3]:pt-12 [&_.rich-text_blockquote]:my-10 [&_.rich-text_blockquote]:border-l [&_.rich-text_blockquote]:border-border-strong [&_.rich-text_blockquote]:pl-6 [&_.rich-text_blockquote]:text-muted">
          <NoteHighlights key={note.id} noteId={String(note.id)} likeTargetId={getNoteLikeTargetId(note.slug)} version={highlightTextVersion(getNoteHighlightText(note.body))}>
            <RichText data={note.body} renderLinkedImages />
          </NoteHighlights>
        </div>

        {readNextNotes.length > 0 ? (
          <section aria-labelledby="continue-reading-heading" className="mx-auto mt-16 max-w-[760px] border-t border-border pt-12">
            <h2 id="continue-reading-heading" className="text-[16px] font-medium">
              Continue reading
            </h2>
            <ul className="mt-5 flex flex-col gap-4">
              {readNextNotes.map((readNextNote) => (
                <li key={readNextNote.slug}>
                  <Link
                    className="inline-block text-[20px] leading-snug transition-opacity hover:opacity-60 tablet:text-[24px]"
                    href={`/notes/${readNextNote.slug}`}
                  >
                    {readNextNote.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </Container>
    </article>
  )
}

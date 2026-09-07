import { Container } from '@/components/Container'
import { RichText } from '@/components/RichText'
import { NoteHighlights } from '@/components/NoteHighlights'
import { PayloadImage } from '@/components/PayloadImage'
import { HoverChevron } from '@/components/Icons'
import { getNoteHighlightText } from '@/lib/noteHighlightAnchors'
import { highlightTextVersion } from '@/lib/noteHighlightStore'
import { getNoteLikeTargetId } from '@/lib/moduleLikes'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { SITE_ORIGIN } from '@/lib/siteMetadata'
import { getPublishedNoteBySlug, getPublishedNoteSlugs, getReadNextNotes } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60
// Notes published after deployment must render without another build.
export const dynamicParams = true

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

  const canonical = new URL(`/notes/${encodeURIComponent(note.slug)}`, SITE_ORIGIN).toString()
  const imageURL = new URL(`${canonical}/og`)
  imageURL.searchParams.set('v', note.updatedAt)
  // Bust immutable/social image caches when the shared design changes too.
  imageURL.searchParams.set('design', 'centered-name-v1')

  const metadata = buildPageMetadata(
    {
      meta: {
        title: note.meta?.title || note.title,
        description: note.meta?.description || note.excerpt,
        image: {
          url: imageURL.toString(),
          width: 1200,
          height: 630,
          alt: `${note.title} — Gabriel Valdivia`,
        },
      },
    },
    {
      fallbackTitle: note.title,
      fallbackDescription: note.excerpt || '',
    },
  )

  return {
    ...metadata,
    alternates: { canonical },
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      url: canonical,
      authors: ['Gabriel Valdivia'],
      publishedTime: note.publishedAt || note.createdAt,
      modifiedTime: note.updatedAt,
    },
  }
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params
  const note = await getPublishedNoteBySlug(slug)
  if (!note) notFound()

  const coverImage = typeof note.coverImage === 'object' ? note.coverImage : null
  const noteDate = formatNoteDate(note.publishedAt || note.createdAt)
  const readNextNotes = await getReadNextNotes(note.id, note.publishedAt)

  return (
    <article className="note-page pb-20 text-text-strong">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <header className="flex flex-col gap-4 pb-12 text-center tablet:pb-16">
            <h1 className="note-page-title text-balance">
              {note.title}
            </h1>
            {noteDate ? <p className="text-[16px] text-text-muted tablet:text-[18px]">{noteDate}</p> : null}
          </header>
        </div>

        {coverImage?.url ? (
          <figure className="mb-12 overflow-hidden rounded-[16px] bg-background-alt tablet:mb-16">
            <PayloadImage
              media={coverImage}
              alt={coverImage.alt || ''}
              className="h-auto w-full"
              height={coverImage.height || 900}
              sizes="(max-width: 809px) calc(100vw - 40px), (max-width: 1479px) calc(100vw - 80px), 1400px"
              width={coverImage.width || 1600}
            />
          </figure>
        ) : null}

        <div className="longform-body mx-auto max-w-[760px]">
          <NoteHighlights key={note.id} noteId={String(note.id)} likeTargetId={getNoteLikeTargetId(note.slug)} version={highlightTextVersion(getNoteHighlightText(note.body))}>
            <RichText data={note.body} renderLinkedImages />
          </NoteHighlights>
        </div>

        {readNextNotes.length > 0 ? (
          <section aria-labelledby="continue-reading-heading" className="mx-auto mt-16 max-w-[760px] border-t border-border pt-12 desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-8">
            <h2 id="continue-reading-heading" className="note-continue-reading-heading text-text-strong">
              Continue reading
            </h2>
            <ul className="mt-5 flex min-w-0 flex-col gap-4 desktop:mt-0">
              {readNextNotes.map((readNextNote) => (
                <li key={readNextNote.slug}>
                  <h3 className="note-recommendation-title">
                    <Link
                      className="group transition-opacity tablet:hover:opacity-60"
                      href={`/notes/${readNextNote.slug}`}
                    >
                      <span>{readNextNote.title}</span>
                      <span className="ml-2 hidden tablet:inline"><HoverChevron /></span>
                    </Link>
                  </h3>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </Container>
    </article>
  )
}

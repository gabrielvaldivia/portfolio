import { Container } from '@/components/Container'
import { RichText } from '@/components/RichText'
import { NoteHighlights } from '@/components/NoteHighlights'
import { NotesSubscribeForm } from '@/components/NotesSubscribeForm'
import { PayloadImage } from '@/components/PayloadImage'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getNoteHighlightText } from '@/lib/noteHighlightAnchors'
import { highlightTextVersion } from '@/lib/noteHighlightStore'
import { getNoteLikeTargetId } from '@/lib/moduleLikes'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNoteBySlug, getPublishedNoteSlugs, getReadNextNotes } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/JsonLd'
import {
  absoluteSiteUrl,
  buildSiteStructuredData,
  personReference,
  websiteReference,
} from '@/lib/structuredData'

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

  const canonicalPath = `/notes/${encodeURIComponent(note.slug)}`
  const canonical = absoluteSiteUrl(canonicalPath)
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
    alternates: {
      canonical: canonicalPath,
      types: { 'text/markdown': `${canonicalPath}/index.md` },
    },
    openGraph: {
      ...metadata.openGraph,
      type: 'article',
      url: canonicalPath,
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
  const [nextNote] = await getReadNextNotes(note.id, note.publishedAt)
  const canonicalPath = `/notes/${encodeURIComponent(note.slug)}`
  const canonical = absoluteSiteUrl(canonicalPath)
  const imageURL = new URL(`${canonical}/og`)
  imageURL.searchParams.set('v', note.updatedAt)
  imageURL.searchParams.set('design', 'centered-name-v1')
  const structuredData = buildSiteStructuredData([{
    '@type': 'Article',
    '@id': `${canonical}#article`,
    url: canonical,
    headline: note.title,
    ...(note.excerpt ? { description: note.excerpt } : {}),
    image: imageURL.toString(),
    datePublished: note.publishedAt || note.createdAt,
    dateModified: note.updatedAt,
    inLanguage: 'en-US',
    author: personReference(),
    publisher: personReference(),
    isPartOf: websiteReference(),
    mainEntityOfPage: { '@id': `${canonical}#webpage` },
  }, {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: note.title,
    isPartOf: websiteReference(),
  }])

  return (
    <>
      <JsonLd data={structuredData} />
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

        <NotesSubscribeForm key={note.id} />

        <nav aria-label="Note navigation" className="mx-auto mt-16 flex max-w-[760px] items-center justify-between gap-4">
          <Link
            href="/notes"
            className="inline-flex min-h-11 items-center gap-2 text-body text-text-muted hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
          >
            <ArrowLeft className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            All notes
          </Link>
          {nextNote ? (
            <Link
              href={`/notes/${nextNote.slug}`}
              rel="next"
              aria-label={`Next note: ${nextNote.title}`}
              className="inline-flex min-h-11 items-center gap-2 text-body text-text-muted hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
            >
              Next note
              <ArrowRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          ) : null}
        </nav>

        </Container>
      </article>
    </>
  )
}

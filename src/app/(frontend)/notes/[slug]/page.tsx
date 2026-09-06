import { Container } from '@/components/Container'
import { LazyModuleLikeButton } from '@/components/LazyModuleLikeButton'
import { NotesSubscribeForm } from '@/components/NotesSubscribeForm'
import { RichText } from '@/components/RichText'
import { getNoteLikeTargetId } from '@/lib/moduleLikes'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNoteBySlug, getPublishedNoteSlugs, getReadNextNote } from '@/lib/queries'
import { ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

type NotePageProps = {
  params: Promise<{ slug: string }>
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
  const readNextNote = await getReadNextNote(note.id, note.publishedAt)

  return (
    <article className="note-page pb-20 text-content">
      <Container>
        <div className="max-w-[880px]">
          <header className="pb-12 tablet:pb-16">
            <h1 className="max-w-[1100px] text-balance text-[40px] leading-[1.05] tablet:text-[64px] desktop:text-[80px]">
              {note.title}
            </h1>
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

        <div className="max-w-[760px] [&_.rich-text]:text-[18px] [&_.rich-text]:leading-[1.65] [&_.rich-text]:text-content tablet:[&_.rich-text]:text-[20px] [&_.rich-text_h2]:mb-8 [&_.rich-text_h2]:pb-4 [&_.rich-text_h2]:pt-16 [&_.rich-text_h3]:mb-6 [&_.rich-text_h3]:pb-4 [&_.rich-text_h3]:pt-12 [&_.rich-text_blockquote]:my-10 [&_.rich-text_blockquote]:border-l [&_.rich-text_blockquote]:border-border-strong [&_.rich-text_blockquote]:pl-6 [&_.rich-text_blockquote]:text-muted">
          <RichText data={note.body} renderLinkedImages />
        </div>

        <div className="mt-12 flex max-w-[760px] items-center justify-between gap-4 border-t border-border pt-6">
          <div className="shrink-0">
            <LazyModuleLikeButton
              noun="note"
              targetId={getNoteLikeTargetId(note.slug)}
            />
          </div>
          {readNextNote?.slug ? (
            <Link
              className="ml-auto inline-flex min-w-0 items-center justify-end gap-2 text-right text-[16px] font-medium transition-opacity hover:opacity-60"
              href={`/notes/${readNextNote.slug}`}
            >
              <span className="line-clamp-2">{readNextNote.title}</span>
              <HugeiconsIcon
                aria-hidden="true"
                className="shrink-0"
                icon={ArrowRight02Icon}
                size={18}
                strokeWidth={1.5}
              />
            </Link>
          ) : null}
        </div>

        <div className="mt-20 tablet:mt-28">
          <NotesSubscribeForm />
        </div>
      </Container>
    </article>
  )
}

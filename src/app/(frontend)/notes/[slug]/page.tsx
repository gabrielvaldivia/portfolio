import { Container } from '@/components/Container'
import { RichText } from '@/components/RichText'
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

        <div className="max-w-[760px] [&_.rich-text]:text-[18px] [&_.rich-text]:leading-[1.65] [&_.rich-text]:text-content tablet:[&_.rich-text]:text-[20px] [&_.rich-text_h2]:mb-8 [&_.rich-text_h2]:pt-16 [&_.rich-text_h3]:mb-6 [&_.rich-text_h3]:pb-4 [&_.rich-text_h3]:pt-12 [&_.rich-text_blockquote]:my-10 [&_.rich-text_blockquote]:border-l [&_.rich-text_blockquote]:border-border-strong [&_.rich-text_blockquote]:pl-6 [&_.rich-text_blockquote]:text-muted">
          <RichText data={note.body} />
        </div>

        {readNextNote?.slug ? (
          <section
            className="mt-20 max-w-[760px] tablet:mt-28"
            aria-labelledby="continue-reading-heading"
          >
            <p className="mb-8 text-caption" id="continue-reading-heading">
              Continue reading
            </p>
            <Link
              className="block rounded-[16px] bg-background-alt p-6 transition-colors hover:bg-background-alt-hover tablet:p-8"
              href={`/notes/${readNextNote.slug}`}
            >
              <h3 className="text-balance text-[24px] leading-[1.2] tablet:text-[30px]">
                {readNextNote.title}
              </h3>
              {readNextNote.excerpt ? (
                <p className="mt-6 text-pretty text-[18px] leading-[1.5] tablet:text-[20px]">
                  {readNextNote.excerpt}
                </p>
              ) : null}
              <span className="mt-6 inline-flex items-center gap-2 text-[16px] font-medium">
                Read now
                <HugeiconsIcon aria-hidden="true" icon={ArrowRight02Icon} size={18} strokeWidth={1.5} />
              </span>
            </Link>
          </section>
        ) : null}
      </Container>
    </article>
  )
}

import { Container } from '@/components/Container'
import { RichText } from '@/components/RichText'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNoteBySlug, getPublishedNoteSlugs } from '@/lib/queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60

type NotePageProps = {
  params: Promise<{ slug: string }>
}

const noteDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
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

  const publishedAt = note.publishedAt || note.createdAt
  const formattedDate = formatNoteDate(publishedAt)
  const coverImage = typeof note.coverImage === 'object' ? note.coverImage : null

  return (
    <article className="pb-20">
      <Container>
        <div className="max-w-[880px]">
          <Link
            className="text-caption text-muted transition-colors hover:text-content"
            href="/notes"
          >
            Notes
          </Link>

          <header className="pb-12 pt-6 tablet:pb-16 tablet:pt-8">
            <h1 className="max-w-[1100px] text-[40px] leading-[1.05] tablet:text-[64px] desktop:text-[80px]">
              {note.title}
            </h1>
            {note.excerpt ? (
              <p className="mt-6 max-w-[760px] text-[20px] leading-[1.45] text-muted tablet:text-[24px]">
                {note.excerpt}
              </p>
            ) : null}
            {formattedDate ? (
              <time className="mt-6 block text-caption text-muted" dateTime={publishedAt}>
                {formattedDate}
              </time>
            ) : null}
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

        <div className="max-w-[760px] [&_.rich-text]:text-[18px] [&_.rich-text]:leading-[1.65] [&_.rich-text]:text-content tablet:[&_.rich-text]:text-[20px] [&_.rich-text_h2]:mb-5 [&_.rich-text_h2]:mt-16 [&_.rich-text_h3]:mb-4 [&_.rich-text_h3]:mt-12 [&_.rich-text_blockquote]:my-10 [&_.rich-text_blockquote]:border-l [&_.rich-text_blockquote]:border-border-strong [&_.rich-text_blockquote]:pl-6 [&_.rich-text_blockquote]:text-muted">
          <RichText data={note.body} />
        </div>
      </Container>
    </article>
  )
}

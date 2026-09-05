import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNotes } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 60

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

export function generateMetadata(): Metadata {
  return buildPageMetadata(null, {
    fallbackTitle: 'Notes',
    fallbackDescription: 'Essays and notes by Gabriel Valdivia.',
  })
}

export default async function NotesPage() {
  const { docs: notes } = await getPublishedNotes()

  return (
    <section className="pb-20">
      <Container>
        <div className="pb-20">
          <h1 className="text-[34px] tablet:hidden">Notes</h1>
          <div className="hidden tablet:block">
            <FitText className="font-heading" maxSize={120}>Notes</FitText>
          </div>
        </div>

        {notes.length > 0 ? (
          <div className="border-t border-border">
            {notes.map((note) => {
              const publishedAt = note.publishedAt || note.createdAt
              const formattedDate = formatNoteDate(publishedAt)

              return (
                <article className="border-b border-border" key={note.id}>
                  <Link
                    className="group grid gap-3 py-6 transition-opacity hover:opacity-60 tablet:grid-cols-[minmax(0,1fr)_180px] tablet:gap-10 tablet:py-8"
                    href={`/notes/${note.slug}`}
                  >
                    <div className="min-w-0">
                      <h2 className="text-[24px] tablet:text-[30px]">{note.title}</h2>
                      {note.excerpt ? (
                        <p className="mt-2 max-w-[760px] text-body text-muted">{note.excerpt}</p>
                      ) : null}
                    </div>
                    {formattedDate ? (
                      <time className="text-caption text-muted tablet:pt-2" dateTime={publishedAt}>
                        {formattedDate}
                      </time>
                    ) : null}
                  </Link>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="border-t border-border py-8">
            <p className="text-body text-muted">No notes published yet.</p>
          </div>
        )}
      </Container>
    </section>
  )
}

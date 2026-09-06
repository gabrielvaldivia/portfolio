import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { NotesSubscribeForm, type SubscriptionMessage } from '@/components/NotesSubscribeForm'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNotes } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 60

function getNoteYear(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear())
}

export function generateMetadata(): Metadata {
  const metadata = buildPageMetadata(null, {
    fallbackTitle: 'Notes',
    fallbackDescription: 'Essays and notes by Gabriel Valdivia.',
  })

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: {
        ...metadata.alternates?.types,
        'application/rss+xml': '/notes/rss.xml',
      },
    },
  }
}

type NotesPageProps = {
  searchParams: Promise<{ subscription?: string | string[] }>
}

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const rawSubscription = (await searchParams).subscription
  const subscription = Array.isArray(rawSubscription) ? rawSubscription[0] : rawSubscription
  const initialMessage = (
    subscription === 'confirmed' || subscription === 'unsubscribed' || subscription === 'invalid'
      ? subscription
      : undefined
  ) as SubscriptionMessage | undefined
  const { docs: notes } = await getPublishedNotes()
  const grouped: Record<string, typeof notes> = {}

  notes.forEach((note) => {
    const year = getNoteYear(note.publishedAt || note.createdAt) || 'Other'
    if (!grouped[year]) grouped[year] = []
    grouped[year].push(note)
  })

  const sortedYears = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return b.localeCompare(a)
  })

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
          <div className="space-y-0">
            {sortedYears.map((year) => (
              <div className="tablet:flex tablet:gap-4" key={year}>
                <div className="sticky top-0 z-10 shrink-0 bg-background py-7 tablet:relative tablet:top-auto tablet:z-auto tablet:w-[100px] tablet:py-0">
                  <h4 className="text-muted tablet:sticky tablet:top-5 tablet:py-4">{year}</h4>
                </div>
                <div className="flex-1">
                  {grouped[year].map((note) => (
                    <div className="py-4" key={note.id}>
                      <Link
                        className="inline-block min-w-0 transition-opacity hover:opacity-60"
                        href={`/notes/${note.slug}`}
                      >
                        <h4 className="text-balance">{note.title}</h4>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-t border-border py-8">
            <p className="text-body text-muted">No notes published yet.</p>
          </div>
        )}

        <div className="mt-20 tablet:mt-28">
          <NotesSubscribeForm initialMessage={initialMessage} />
        </div>
      </Container>
    </section>
  )
}

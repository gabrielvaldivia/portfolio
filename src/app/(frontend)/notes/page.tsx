import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { HoverChevron } from '@/components/Icons'
import { NotesSubscribePanel } from '@/components/NotesSubscribePanel'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPublishedNotes } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/JsonLd'
import { absoluteSiteUrl, buildSiteStructuredData, websiteReference } from '@/lib/structuredData'

export const revalidate = 60

function getNoteYear(value?: string | null) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear())
}

export function generateMetadata(): Metadata {
  return buildPageMetadata(null, {
    fallbackTitle: 'Notes',
    fallbackDescription: 'Essays and notes by Gabriel Valdivia.',
    canonicalPath: '/notes',
    markdownPath: '/notes/index.md',
  })
}

export default async function NotesPage() {
  const { docs: notes } = await getPublishedNotes()
  const structuredData = buildSiteStructuredData([{
    '@type': 'CollectionPage',
    '@id': absoluteSiteUrl('/notes#collection-page'),
    url: absoluteSiteUrl('/notes'),
    name: 'Notes by Gabriel Valdivia',
    description: 'Essays and notes by Gabriel Valdivia.',
    inLanguage: 'en-US',
    isPartOf: websiteReference(),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: notes.map((note, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: note.title,
        url: absoluteSiteUrl(`/notes/${encodeURIComponent(note.slug)}`),
      })),
    },
  }])
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
    <>
      <JsonLd data={structuredData} />
      <section className="pb-20">
        <Container>
          <div className="pb-4 tablet:pb-20">
            <h1 className="text-[34px] tablet:hidden">Notes</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>Notes</FitText>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] desktop:gap-20">
            <NotesSubscribePanel />

            {notes.length > 0 ? (
              <div className="min-w-0">
                {sortedYears.map((year) => (
                  <div className="tablet:flex tablet:gap-4" key={year}>
                    <div className="sticky -top-6 z-10 shrink-0 bg-background pt-12 pb-4 tablet:relative tablet:top-auto tablet:z-auto tablet:w-[100px] tablet:py-0">
                      <h2 className="notes-list-heading notes-list-year tabular-nums text-text-subtle tablet:sticky tablet:top-5 tablet:py-4 tablet:text-text-body">{year}</h2>
                    </div>
                    <div className="min-w-0 flex-1">
                      {grouped[year].map((note) => {
                        const lastSpace = note.title.lastIndexOf(' ')

                        return (
                          <div className="py-4" key={note.id}>
                            <Link
                              className="group inline-block min-w-0 transition-colors tablet:hover:opacity-60"
                              href={`/notes/${note.slug}`}
                            >
                              <h3 className="notes-list-heading">
                                {note.title.slice(0, lastSpace + 1)}
                                <span className="whitespace-nowrap">
                                  {note.title.slice(lastSpace + 1)}
                                  <HoverChevron className="ml-2 translate-y-0.5 align-baseline" />
                                </span>
                              </h3>
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-t border-border py-8">
                <p className="text-body text-text-body">No notes published yet.</p>
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  )
}

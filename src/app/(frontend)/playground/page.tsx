import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { getSideProjects } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Playground — Gabriel Valdivia',
  description: 'Side projects and experiments',
}

export const dynamic = 'force-dynamic'

export default async function PlaygroundPage() {
  const { docs: projects } = await getSideProjects()

  // Group projects by year (descending)
  const grouped: Record<string, typeof projects> = {}
  projects.forEach((project: any) => {
    const year = project.year || 'Other'
    if (!grouped[year]) grouped[year] = []
    grouped[year].push(project)
  })

  const sortedYears = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return b.localeCompare(a)
  })

  return (
    <>
      <section className="px-5 tablet:px-10 pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <section className="pb-20">
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">Playground</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>Playground</FitText>
            </div>
          </div>
          <div className="space-y-0">
            {sortedYears.map((year) => (
              <div key={year} className="tablet:flex tablet:gap-4">
                <div className="sticky top-0 z-10 bg-background py-7 tablet:relative tablet:top-auto tablet:z-auto tablet:w-[100px] tablet:py-0 shrink-0">
                  <h4 className="text-muted tablet:sticky tablet:top-5 tablet:py-4">{year}</h4>
                </div>
                <div className="flex-1">
                  {(grouped[year] as any[]).map((project: any) => {
                    const page = project.page as any
                    const href = project.linkType === 'internal' && page
                      ? `/${page.slug}`
                      : project.url || null
                    const isInternal = project.linkType === 'internal'
                    return (
                      <div key={project.id} className="py-4 flex items-baseline gap-4 group min-w-0 overflow-hidden">
                        {href ? (
                          isInternal ? (
                            <Link href={href} className="flex items-baseline gap-4 tablet:hover:opacity-60 transition-colors min-w-0">
                              <h4 className="shrink-0">{project.title}</h4>
                              {project.description && (
                                <p className="text-muted overflow-hidden text-ellipsis whitespace-nowrap tablet:whitespace-normal tablet:overflow-visible tablet:inline-flex tablet:items-baseline tablet:gap-2">{project.description}<svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px] hidden tablet:block" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg></p>
                              )}
                              {!project.description && (
                                <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px] hidden tablet:block" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                              )}
                            </Link>
                          ) : (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-baseline gap-4 tablet:hover:opacity-60 transition-colors min-w-0">
                              <h4 className="shrink-0">{project.title}</h4>
                              {project.description && (
                                <p className="text-muted overflow-hidden text-ellipsis whitespace-nowrap tablet:whitespace-normal tablet:overflow-visible tablet:inline-flex tablet:items-baseline tablet:gap-2">{project.description}<svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px] hidden tablet:block" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg></p>
                              )}
                              {!project.description && (
                                <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px] hidden tablet:block" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                              )}
                            </a>
                          )
                        ) : (
                          <>
                            <h4 className="shrink-0">{project.title}</h4>
                            {project.description && (
                              <p className="text-muted overflow-hidden text-ellipsis whitespace-nowrap tablet:whitespace-normal tablet:overflow-visible">{project.description}</p>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

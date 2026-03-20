import { Container } from '@/components/Container'
import { RichText } from '@/components/RichText'
import { getPageBySlug, getSideProjects } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'About — Gabriel Valdivia',
  description: 'Designer and creative technologist',
}

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const page = await getPageBySlug('about')

  const sideProjectsResult = await getSideProjects()
  const sideProjects = sideProjectsResult.docs.slice(0, 5) as any[]
  const talks = (page?.talks || []) as any[]
  const interviews = (page?.interviews || []) as any[]
  const patents = (page?.patents || []) as any[]

  return (
    <>
      <section className="px-5 tablet:px-10 pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <section className="pb-20 tablet:pb-40">
        <Container>
          <div className="flex flex-col gap-20">
            {/* Bio */}
            {page?.bio && (
              <div className="grid grid-cols-1 tablet:grid-cols-6 gap-6 tablet:gap-10">
                <div className="tablet:col-span-2">
                  <h3 className="sticky top-5">Bio</h3>
                </div>
                <div className="tablet:col-span-4 text-body-large">
                  <RichText data={page.bio} />
                </div>
              </div>
            )}

            {/* Talks */}
            {talks.length > 0 && (
              <div className="grid grid-cols-1 tablet:grid-cols-6 gap-6 tablet:gap-10">
                <div className="tablet:col-span-2">
                  <h3 className="sticky top-5">Talks</h3>
                </div>
                <div className="tablet:col-span-4">
                  <div className="flex flex-col gap-8">
                    {talks.map((talk: any, i: number) => {
                      const thumb = talk.thumbnail as any
                      return (
                        <div key={i} className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-6 group">
                          {thumb?.url && (
                            talk.url ? (
                              <a href={talk.url} target="_blank" rel="noopener noreferrer" className="w-full tablet:w-52 tablet:shrink-0 aspect-video rounded-lg overflow-hidden border border-border relative block">
                                <Image src={thumb.url} alt={thumb.alt || talk.title} fill className="object-cover object-center" sizes="(min-width: 768px) 208px, 100vw" />
                                {talk.duration && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[11px] font-mono px-1.5 py-0.5 rounded uppercase">{talk.duration}</span>
                                )}
                              </a>
                            ) : (
                              <div className="w-full tablet:w-52 tablet:shrink-0 aspect-video rounded-lg overflow-hidden border border-border relative">
                                <Image src={thumb.url} alt={thumb.alt || talk.title} fill className="object-cover object-center" sizes="(min-width: 768px) 208px, 100vw" />
                                {talk.duration && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[11px] font-mono px-1.5 py-0.5 rounded uppercase">{talk.duration}</span>
                                )}
                              </div>
                            )
                          )}
                          <div className="tablet:flex-1">
                            {talk.url ? (
                              <a href={talk.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-colors inline-flex items-baseline gap-2">
                                <h4>{talk.title}</h4>
                                <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[5px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                              </a>
                            ) : (
                              <h4>{talk.title}</h4>
                            )}
                            <p className="text-muted" style={{ marginTop: 12 }}>{talk.event}{talk.year && `, ${talk.year}`}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Interviews */}
            {interviews.length > 0 && (
              <div className="grid grid-cols-1 tablet:grid-cols-6 gap-6 tablet:gap-10">
                <div className="tablet:col-span-2">
                  <h3 className="sticky top-5">Interviews</h3>
                </div>
                <div className="tablet:col-span-4">
                  <div className="flex flex-col gap-8">
                    {interviews.map((item: any, i: number) => {
                      const thumb = item.thumbnail as any
                      return (
                        <div key={i} className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-6 group">
                          {thumb?.url && (
                            item.url ? (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="w-full tablet:w-52 tablet:shrink-0 aspect-video rounded-lg overflow-hidden border border-border relative block">
                                <Image src={thumb.url} alt={thumb.alt || item.title} fill className="object-cover object-center" sizes="(min-width: 768px) 208px, 100vw" />
                                {item.duration && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[11px] font-mono px-1.5 py-0.5 rounded uppercase">{item.duration}</span>
                                )}
                              </a>
                            ) : (
                              <div className="w-full tablet:w-52 tablet:shrink-0 aspect-video rounded-lg overflow-hidden border border-border relative">
                                <Image src={thumb.url} alt={thumb.alt || item.title} fill className="object-cover object-center" sizes="(min-width: 768px) 208px, 100vw" />
                                {item.duration && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[11px] font-mono px-1.5 py-0.5 rounded uppercase">{item.duration}</span>
                                )}
                              </div>
                            )
                          )}
                          <div className="tablet:flex-1">
                            {item.url ? (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-colors inline-flex items-baseline gap-2">
                                <h4>{item.title}</h4>
                                <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[5px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                              </a>
                            ) : (
                              <h4>{item.title}</h4>
                            )}
                            <p className="text-muted" style={{ marginTop: 12 }}>{item.event}{item.year && `, ${item.year}`}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Patents */}
            {patents.length > 0 && (
              <div className="grid grid-cols-1 tablet:grid-cols-6 gap-6 tablet:gap-10">
                <div className="tablet:col-span-2">
                  <h3 className="sticky top-5">Patents</h3>
                </div>
                <div className="tablet:col-span-4">
                  <div className="flex flex-col gap-8">
                    {patents.map((patent: any, i: number) => patent.url ? (
                      <a key={i} href={patent.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-6 group hover:opacity-60 transition-colors">
                        <div className="flex-1 flex items-baseline gap-2">
                          <h4>{patent.title}</h4>
                          <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                        </div>
                      </a>
                    ) : (
                      <div key={i} className="flex items-center gap-6">
                        <div className="flex-1">
                          <h4>{patent.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Playground */}
            <div className="grid grid-cols-1 tablet:grid-cols-6 gap-6 tablet:gap-10">
              <div className="tablet:col-span-2">
                <h3 className="sticky top-5">Playground</h3>
              </div>
              <div className="tablet:col-span-4">
                <div className="flex flex-col gap-8">
                  {sideProjects.map((project: any, i: number) => {
                    const thumb = project.image as any
                    const href = project.slug ? `/playground/${project.slug}` : null
                    return href ? (
                      <Link key={i} href={href} className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-6 group hover:opacity-60 transition-colors">
                        {thumb?.url && (
                          <div className="w-full tablet:w-52 tablet:shrink-0 aspect-video rounded-lg overflow-hidden border border-border relative">
                            <Image
                              src={thumb.url}
                              alt={thumb.alt || project.title}
                              fill
                              className="object-cover object-center"
                              sizes="(min-width: 768px) 208px, 100vw"
                            />
                          </div>
                        )}
                        <div className="flex flex-col tablet:flex-row tablet:flex-1 tablet:items-baseline gap-1 tablet:gap-4">
                          <h4>{project.title}</h4>
                          {project.description && (
                            <p className="text-muted inline-flex items-baseline gap-2">{project.description}<svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[5px]" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg></p>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div key={i} className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-6">
                        {thumb?.url && (
                          <div className="w-full tablet:w-52 tablet:shrink-0 aspect-video rounded-lg overflow-hidden border border-border relative">
                            <Image
                              src={thumb.url}
                              alt={thumb.alt || project.title}
                              fill
                              className="object-cover object-center"
                              sizes="(min-width: 768px) 208px, 100vw"
                            />
                          </div>
                        )}
                        <div className="flex flex-col tablet:flex-row tablet:flex-1 tablet:items-baseline gap-1 tablet:gap-4">
                          <h4>{project.title}</h4>
                          {project.description && (
                            <p className="text-muted">{project.description}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Link href="/playground" className="text-muted hover:text-content transition-colors inline-flex items-center gap-2 mt-8 group">
                  View all
                  <svg className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

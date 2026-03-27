import { Container } from '@/components/Container'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RichText } from '@/components/RichText'
import { getSideProjectBySlug, getSideProjects } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FitText } from '@/components/FitText'

export const revalidate = 60

export async function generateStaticParams() {
  try {
    const { docs } = await getSideProjects()
    return docs.filter((p: any) => p.slug).map((p: any) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const project = await getSideProjectBySlug(slug)
  if (!project) return {}
  return {
    title: `${project.title} — Gabriel Valdivia`,
    description: project.description || '',
  }
}


export default async function SideProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getSideProjectBySlug(slug) as any
  if (!project) notFound()

  return (
    <>
      <section className="px-5 tablet:px-10 pt-6 tablet:pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <article>
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">{project.title}</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={200}>
                {project.title}
              </FitText>
            </div>
          </div>
          <div className="flex flex-col gap-20">
            <div className="flex flex-col gap-10">
              <div className="max-w-[600px]">
                {project.richDescription ? (
                  <RichText data={project.richDescription} />
                ) : project.description ? (
                  <p className="text-body">{project.description}</p>
                ) : null}
                {project.year && (
                  <p style={{ marginTop: 20 }}>
                    <span className="text-muted opacity-50">{project.year}</span>
                    {(project.collaborators as any[])?.length > 0 && (
                      <>
                        <span className="text-muted opacity-50"> · In collaboration with </span>
                        {(project.collaborators as any[]).map((c: any, i: number, arr: any[]) => {
                          const name = typeof c === 'object' ? c.name : c
                          const linkedin = typeof c === 'object' ? c.linkedIn : null
                          const separator = i === 0 ? '' : i === arr.length - 1 ? ' and ' : ', '
                          return (
                            <span key={i}>
                              {separator && <span className="text-muted opacity-50">{separator}</span>}
                              {linkedin ? <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-muted opacity-55 hover:opacity-100 hover:underline underline-offset-[3px] transition-all">{name}</a> : <span className="text-muted opacity-50">{name}</span>}
                            </span>
                          )
                        })}
                      </>
                    )}
                  </p>
                )}
              </div>

              {(project.links as any[])?.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {(project.links as any[]).map((link: any, i: number) => (
                    <a
                      key={i}
                      href={link.url}
                      target={link.url.startsWith('/') ? undefined : '_blank'}
                      rel={link.url.startsWith('/') ? undefined : 'noopener noreferrer'}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-content hover:opacity-80 transition-opacity font-medium"
                      style={{ color: 'var(--color-inverse)' }}
                    >
                      {link.label}
                      {!link.url.startsWith('/') && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <RenderBlocks blocks={project.content as any[]} />
          </div>
        </Container>

        <div className="h-20" />
      </article>
    </>
  )
}

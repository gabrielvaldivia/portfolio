import { Container } from '@/components/Container'
import { Avatar } from '@/components/Avatar'
import { ServicePill } from '@/components/ServicePill'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RichText } from '@/components/RichText'
import { getSideProjectBySlug, getSideProjects } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FitText } from '@/components/FitText'

export const dynamic = 'force-dynamic'

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

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-10 items-start">
      <h6 className="w-[100px] shrink-0 pt-1">{label}</h6>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default async function SideProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getSideProjectBySlug(slug) as any
  if (!project) notFound()

  const team = (project.team || []) as any[]
  const services = (project.services || []) as any[]

  return (
    <>
      <section className="px-5 tablet:px-10 pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <article>
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">{project.title}</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading">
                {project.title}
              </FitText>
            </div>
          </div>
          <div className="flex flex-col gap-20">
            <div className="flex flex-col tablet:flex-row gap-10 tablet:gap-10 desktop:gap-20">
              <div className="flex-1">
                {project.richDescription ? (
                  <RichText data={project.richDescription} />
                ) : project.description ? (
                  <p className="text-body">{project.description}</p>
                ) : null}
              </div>

              <div className="flex-1 space-y-5">
                {team.length > 0 && (
                  <MetaRow label="Team">
                    <div className="flex flex-wrap gap-2.5">
                      {team.map((person: any) => (
                        <Avatar key={person.id} name={person.name} photo={person.photo} role={person.role} linkedIn={person.linkedIn} />
                      ))}
                    </div>
                  </MetaRow>
                )}

                {services.length > 0 && (
                  <MetaRow label="Services">
                    <div className="flex flex-wrap gap-2.5">
                      {services.map((s: any) => (
                        <ServicePill key={s.id} title={s.title} size="small" />
                      ))}
                    </div>
                  </MetaRow>
                )}

                {project.year && (
                  <MetaRow label="Date">
                    <p className="text-body">{project.year}</p>
                  </MetaRow>
                )}
              </div>
            </div>

            <RenderBlocks blocks={project.content as any[]} />
          </div>
        </Container>

        <div className="h-20" />
      </article>
    </>
  )
}

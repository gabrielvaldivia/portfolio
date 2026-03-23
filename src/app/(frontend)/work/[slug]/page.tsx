import { Container } from '@/components/Container'
import { Avatar } from '@/components/Avatar'
import { ServicePill } from '@/components/ServicePill'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RichText } from '@/components/RichText'
import { getProjectBySlug, getProjects } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { FitText } from '@/components/FitText'

export const revalidate = 60

export async function generateStaticParams() {
  try {
    const { docs } = await getProjects()
    return docs.map((project: any) => ({ slug: project.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return {}
  const title = `${project.meta?.title || project.title} — Gabriel Valdivia`
  const description = project.meta?.description || project.subtitle || ''
  const ogImage = project.meta?.image?.url || project.featuredImage?.url
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

function MetaRow({ label, children, baseline }: { label: string; children: React.ReactNode; baseline?: boolean }) {
  return (
    <div className={`flex gap-10 ${baseline ? 'items-baseline' : 'items-start'}`}>
      <h6 className="w-[50px] tablet:w-[100px] shrink-0 text-muted" style={baseline ? undefined : { paddingTop: '10px' }}>{label}</h6>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const team = (project.team || []) as any[]
  const services = (project.services || []) as any[]
  const featuredImage = project.featuredImage as any

  return (
    <>
      {/* Header */}
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
              <FitText className="font-heading">
                {project.title}
              </FitText>
            </div>
          </div>
          <div className="flex flex-col gap-20">

            {/* Hero: 2-column — description left, meta right */}
            <div className="flex flex-col tablet:flex-row gap-10 tablet:gap-10 desktop:gap-20">
              {/* Description */}
              <div className="flex-1">
                {project.description ? (
                  <RichText data={project.description} />
                ) : project.subtitle ? (
                  <p className="text-[20px] leading-[1.4]">{project.subtitle}</p>
                ) : null}
              </div>

              {/* Meta */}
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
                  <MetaRow label="Date" baseline>
                    <p className="text-body">{project.year}</p>
                  </MetaRow>
                )}
              </div>
            </div>


            {/* Content blocks */}
            <RenderBlocks blocks={project.content as any[]} />
          </div>
        </Container>

        {/* Footer spacing */}
        <div className="h-20" />
      </article>
    </>
  )
}

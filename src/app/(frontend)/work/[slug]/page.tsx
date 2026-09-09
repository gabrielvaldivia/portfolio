import { Container } from '@/components/Container'
import { Avatar } from '@/components/Avatar'
import { ServicePill } from '@/components/ServicePill'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RichText } from '@/components/RichText'
import { getProjectBySlug, getProjectSlugs } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { FitText } from '@/components/FitText'
import { JsonLd } from '@/components/JsonLd'
import { entityName, lexicalToPlainText } from '@/lib/agentMarkdown'
import {
  absoluteSiteUrl,
  buildSiteStructuredData,
  compactJsonLdValues,
  personReference,
  websiteReference,
} from '@/lib/structuredData'

export const revalidate = 60

export async function generateStaticParams() {
  try {
    const slugs = await getProjectSlugs()
    return slugs.map((slug) => ({ slug }))
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
  const metaImage = typeof project.meta?.image === 'object' ? project.meta?.image : undefined
  const featuredImage = typeof project.featuredImage === 'object' ? project.featuredImage : undefined
  const ogImage = metaImage?.url || featuredImage?.url
  const canonicalPath = `/work/${encodeURIComponent(slug)}`
  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      types: { 'text/markdown': `${canonicalPath}/index.md` },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
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
      <h6 className="w-[50px] tablet:w-[100px] shrink-0 text-text-muted" style={baseline ? undefined : { paddingTop: '10px' }}>{label}</h6>
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
  const canonicalPath = `/work/${encodeURIComponent(slug)}`
  const description = project.meta?.description || project.subtitle || lexicalToPlainText(project.description)
  const projectImage = typeof project.meta?.image === 'object' && project.meta.image?.url
    ? project.meta.image.url
    : typeof project.featuredImage === 'object' && project.featuredImage?.url
      ? project.featuredImage.url
      : undefined
  const contributors = compactJsonLdValues(team.map((person) => {
    const name = entityName(person)
    return name ? { '@type': 'Person', name } : null
  }))
  const projectYear = typeof project.year === 'string' && /^\d{4}$/.test(project.year.trim())
    ? project.year.trim()
    : undefined
  const structuredData = buildSiteStructuredData([{
    '@type': 'WebPage',
    '@id': absoluteSiteUrl(`${canonicalPath}#webpage`),
    url: absoluteSiteUrl(canonicalPath),
    name: project.title,
    ...(description ? { description } : {}),
    inLanguage: 'en-US',
    isPartOf: websiteReference(),
    author: personReference(),
    mainEntity: {
      '@type': 'CreativeWork',
      '@id': absoluteSiteUrl(`${canonicalPath}#project`),
      name: project.title,
      ...(description ? { description } : {}),
      ...(projectYear ? { dateCreated: projectYear } : {}),
      ...(projectImage ? { image: projectImage } : {}),
      ...(services.length ? { keywords: services.map(entityName).filter(Boolean) } : {}),
      ...(contributors.length ? { contributor: contributors } : {}),
    },
  }])
  return (
    <>
      <JsonLd data={structuredData} />

      <article>
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">{project.title}</h1>
            <div className="hidden tablet:block" style={{ marginLeft: '-5px' }}>
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
            <RenderBlocks blocks={project.content as any[]} likeNamespace={`project:${slug}`} />
          </div>
        </Container>

        {/* Footer spacing */}
        <div className="h-20" />
      </article>
    </>
  )
}

import { Container } from '@/components/Container'
import { Avatar } from '@/components/Avatar'
import { ServicePill } from '@/components/ServicePill'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RichText } from '@/components/RichText'
import { getProjectBySlug, getProjectSlugs } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { WorkTitle } from '@/components/WorkTitle'
import { JsonLd } from '@/components/JsonLd'
import { buildProjectMetadata, projectShareImage } from '@/lib/projectMetadata'
import { withSiteSocialDefaults } from '@/lib/pageMetadataDefaults'
import { entityName, lexicalToPlainText } from '@/lib/agentMarkdown'
import {
  absoluteSiteUrl,
  buildSiteStructuredData,
  compactJsonLdValues,
  personReference,
  websiteReference,
} from '@/lib/structuredData'

export const revalidate = 3600

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
  const canonicalPath = `/work/${encodeURIComponent(slug)}`
  return withSiteSocialDefaults(buildProjectMetadata(project, {
    canonicalPath,
    markdownPath: `${canonicalPath}/index.md`,
  }))
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
  const projectImage = projectShareImage(project)?.url
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
        {/* Wide screens: title, description and meta sit in a fixed left sidebar while the work scrolls. */}
        <Container className="wide:max-w-none wide:pl-[560px]">
          {/* Pinned to the browser's left edge; its top padding clears the site header (which stays clickable through it) plus 64px, matching the gap above the work. */}
          <aside className="wide:pointer-events-none wide:fixed wide:inset-y-0 wide:left-0 wide:w-[520px] wide:px-10 wide:pt-[178px] wide:pb-10">
            <div className="pb-20 wide:pb-10 wide:pointer-events-auto">
              {/* The fitted title is drawn by a client component; keep a real heading for assistive tech. */}
              <h1 className="sr-only">{project.title}</h1>
              {/* In the sidebar, pull the 64px title up so its cap height lines up with the top of the work. */}
              <div aria-hidden className="wide:-mt-4">
                <WorkTitle title={project.title} />
              </div>
            </div>

            {/* Description beside meta from tablet; stacked in the sidebar on wide screens */}
            <div className="flex flex-col tablet:flex-row wide:flex-col gap-10 desktop:gap-20 wide:gap-10 wide:pointer-events-auto">
              {/* Same size as the body text in the project's content blocks. */}
              <div className="flex-1 text-body">
                {project.description ? (
                  <RichText data={project.description} />
                ) : project.subtitle ? (
                  <p>{project.subtitle}</p>
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
                  <MetaRow label="Date" baseline>
                    <p className="text-body">{project.year}</p>
                  </MetaRow>
                )}
              </div>
            </div>
          </aside>

          {/* Content blocks */}
          <div className="mt-20 wide:mx-auto wide:mt-16 wide:max-w-[2000px] min-w-0">
            <RenderBlocks blocks={project.content as any[]} likeNamespace={`project:${slug}`} />
          </div>
        </Container>

        {/* Footer spacing */}
        <div className="h-20" />
      </article>
    </>
  )
}

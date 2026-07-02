import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { RichText } from '@/components/RichText'
import { getPageBySlug, getSideProjects } from '@/lib/queries'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { HoverChevron } from '@/components/Icons'

function HoverArrow() {
  return (
    <svg className="inline-block ml-2 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[0px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
  )
}

function AboutSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 tablet:grid-cols-6 gap-6 tablet:gap-10">
      <div className="tablet:col-span-2">
        <h3 className="sticky top-5">{title}</h3>
      </div>
      <div className="tablet:col-span-4">
        {children}
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'About — Gabriel Valdivia',
  description: 'Designer and creative technologist',
}

export const revalidate = 60

export default async function AboutPage() {
  const page = await getPageBySlug('about')

  const sideProjectsResult = await getSideProjects()
  const sideProjects = sideProjectsResult.docs as any[]
  const aboutSections = (page?.aboutSections as any[]) || []

  const renderMediaList = (items: any[]) => (
    <div className="flex flex-col gap-8">
      {items.map((item: any, i: number) => {
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
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-colors">
                  <h4 className="inline">{item.title}<HoverArrow /></h4>
                </a>
              ) : (
                <h4>{item.title}</h4>
              )}
              <p className="text-muted" style={{ marginTop: '8px' }}>{item.event}{item.year && `, ${item.year}`}</p>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderPlayground = (section: any) => {
    const limit = typeof section.itemLimit === 'number' && section.itemLimit > 0 ? section.itemLimit : 5
    const projects = sideProjects.slice(0, limit)
    if (projects.length === 0) return null

    return (
      <AboutSection title={section.title || 'Playground'}>
        <div className="flex flex-col gap-8">
          {projects.map((project: any, i: number) => {
            const thumb = project.featuredImage as any
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
                    <p className="text-muted inline-flex items-baseline gap-2">{project.description}<HoverChevron /></p>
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
        <Link href="/playground" className="text-muted hover:opacity-50 transition-opacity inline-flex items-center gap-2 mt-8">
          {section.linkText || 'View all'}
          <svg className="shrink-0 translate-y-[1px]" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
        </Link>
      </AboutSection>
    )
  }

  const renderSection = (section: any) => {
    switch (section.blockType) {
      case 'aboutBioSection': {
        const bio = section.bio
        if (!bio) return null
        return (
          <AboutSection title={section.title || 'Bio'}>
            <div className="text-body-large">
              <RichText data={bio} />
            </div>
          </AboutSection>
        )
      }
      case 'aboutTalksSection': {
        const talks = (section.talks || []) as any[]
        if (talks.length === 0) return null
        return (
          <AboutSection title={section.title || 'Talks'}>
            {renderMediaList(talks)}
          </AboutSection>
        )
      }
      case 'aboutInterviewsSection': {
        const interviews = (section.interviews || []) as any[]
        if (interviews.length === 0) return null
        return (
          <AboutSection title={section.title || 'Interviews'}>
            {renderMediaList(interviews)}
          </AboutSection>
        )
      }
      case 'aboutPatentsSection': {
        const patents = (section.patents || []) as any[]
        if (patents.length === 0) return null
        return (
          <AboutSection title={section.title || 'Patents'}>
            <div className="flex flex-col gap-8">
              {patents.map((patent: any, i: number) => patent.url ? (
                <a key={i} href={patent.url} target="_blank" rel="noopener noreferrer" className="group hover:opacity-60 transition-colors">
                  <h4 className="inline">{patent.title}<HoverArrow /></h4>
                </a>
              ) : (
                <div key={i} className="flex items-center gap-6">
                  <div className="flex-1">
                    <h4>{patent.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </AboutSection>
        )
      }
      case 'aboutPlaygroundSection':
        return renderPlayground(section)
      default:
        return null
    }
  }

  return (
    <>
      <section className="pb-20 tablet:pb-40">
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">About</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>About</FitText>
            </div>
          </div>
          <div className="flex flex-col gap-20">
            {aboutSections.map((section: any, i: number) => (
              <div key={section.id || `${section.blockType}-${i}`}>
                {renderSection(section)}
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

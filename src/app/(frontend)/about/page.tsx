import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { RichText } from '@/components/RichText'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPageBySlug, getSideProjects } from '@/lib/queries'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { HoverArrow, HoverChevron } from '@/components/Icons'
import { SprayPaintPortrait } from '@/components/SprayPaintPortrait'
import { cn } from '@/lib/cn'

const PUBLIC_CMS_API = 'https://www.gabrielvaldivia.com/api'

async function getPublicAboutPreview() {
  const request = async (path: string) => {
    const response = await fetch(`${PUBLIC_CMS_API}${path}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Public CMS request failed with ${response.status}`)
    return response.json()
  }

  const [aboutResult, homeResult, sideProjectsResult] = await Promise.all([
    request('/pages?where%5Bslug%5D%5Bequals%5D=about&depth=2&limit=1'),
    request('/pages?where%5Bslug%5D%5Bequals%5D=home&depth=2&limit=1'),
    request('/side-projects?sort=order&depth=2&limit=100'),
  ])

  return {
    aboutPage: aboutResult.docs?.[0] || null,
    homePage: homeResult.docs?.[0] || null,
    sideProjects: sideProjectsResult.docs || [],
  }
}

function AboutSection({
  title,
  children,
  alignBaseline = true,
  aside,
}: {
  title: string
  children: ReactNode
  alignBaseline?: boolean
  aside?: ReactNode
}) {
  return (
    <div className={cn(
      'grid grid-cols-1 gap-6 tablet:grid-cols-6 tablet:gap-10',
      alignBaseline ? 'tablet:items-baseline' : 'tablet:items-start',
    )}>
      <div className="tablet:col-span-2">
        {aside || <h2 className="sticky top-5 text-balance">{title}</h2>}
      </div>
      <div className="tablet:col-span-4">
        {children}
      </div>
    </div>
  )
}

function AboutBio() {
  return (
    <div className="rich-text text-pretty text-body-large">
      <p>
        I’ve spent 15 years designing for some of the world’s top tech companies while building products of my own. From{' '}
        <Link href="/work/automatic">Automatic</Link> to{' '}
        <Link href="/work/fb-sharing">Meta</Link>,{' '}
        <Link href="/work/assembler">Google</Link>,{' '}
        <Link href="/work/tonic">CNN</Link>, and{' '}
        <Link href="/work/patreon">Patreon</Link>, I’ve worked across product, brand, and emerging technology, helping teams turn ambitious ideas into products people use.
      </p>
      <p>
        Today, I bring that experience to early-stage teams building their first generation of products. I work fractionally with companies like{' '}
        <Link href="/work/daylight">Daylight Computer</Link>,{' '}
        <Link href="/work/workmate">Workmate</Link>,{' '}
        <Link href="/work/slingshot">Slingshot AI</Link>, and{' '}
        <a href="https://www.gv.com/" target="_blank" rel="noopener noreferrer">Google Ventures</a>, helping founders avoid attractive wrong turns, make better decisions, and move quickly from idea to product.
      </p>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('about')

  return buildPageMetadata(page, {
    fallbackTitle: 'About',
    fallbackDescription: 'Designer and creative technologist',
  })
}

export const revalidate = 60

export default async function AboutPage() {
  const [localPage, localHomePage, sideProjectsResult] = await Promise.all([
    getPageBySlug('about'),
    getPageBySlug('home'),
    getSideProjects(),
  ])
  const publicPreview = process.env.NODE_ENV === 'development' && (!localPage || !localHomePage)
    ? await getPublicAboutPreview().catch((error) => {
        console.error('Public about preview unavailable.', error)
        return null
      })
    : null
  const page = localPage || publicPreview?.aboutPage
  const homePage = localHomePage || publicPreview?.homePage
  const sideProjects = (sideProjectsResult.docs.length
    ? sideProjectsResult.docs
    : publicPreview?.sideProjects || []) as any[]
  const aboutSections = (page?.aboutSections as any[]) || []
  const homeAboutSection = ((homePage?.sections as any[]) || []).find(
    (section: any) => section.blockType === 'aboutSection',
  )
  const portraitImage = typeof homeAboutSection?.image === 'object'
    ? homeAboutSection.image
    : typeof page?.bioImage === 'object'
      ? page.bioImage
      : { url: '/media/about-photo.png', alt: 'Portrait of Gabriel Valdivia' }
  const portraitImageDark = typeof homeAboutSection?.imageDark === 'object'
    ? homeAboutSection.imageDark
    : null

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
            const href = project.slug ? `/playground/${project.slug}` : null
            return href ? (
              <Link key={i} href={href} className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-6 group hover:opacity-60 transition-colors">
                <div className="flex flex-col tablet:flex-row tablet:flex-1 tablet:items-baseline gap-1 tablet:gap-4">
                  <h4>{project.title}</h4>
                  {project.description && (
                    <p className="text-muted inline-flex items-baseline gap-2">{project.description}<HoverChevron /></p>
                  )}
                </div>
              </Link>
            ) : (
              <div key={i} className="flex flex-col tablet:flex-row tablet:items-center gap-3 tablet:gap-6">
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
        return (
          <AboutSection
            title={section.title || 'Bio'}
            alignBaseline={false}
            aside={(
              <div className="w-full tablet:sticky tablet:top-5 tablet:max-w-[360px]">
                <SprayPaintPortrait
                  image={portraitImage}
                  imageDark={portraitImageDark}
                  eager
                />
              </div>
            )}
          >
            <AboutBio />
            <Link
              href="/timeline"
              className="mt-8 inline-flex items-center gap-2 text-body-large text-muted transition-opacity duration-150 hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content"
            >
              View timeline
              <svg
                aria-hidden="true"
                className="size-6 shrink-0 translate-y-px"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
            </Link>
          </AboutSection>
        )
      }
      case 'aboutTalksSection': {
        const talks = (section.talks || []) as any[]
        if (talks.length === 0) return null
        return (
          <AboutSection title={section.title || 'Talks'} alignBaseline={false}>
            {renderMediaList(talks)}
          </AboutSection>
        )
      }
      case 'aboutInterviewsSection': {
        const interviews = (section.interviews || []) as any[]
        if (interviews.length === 0) return null
        return (
          <AboutSection title={section.title || 'Interviews'} alignBaseline={false}>
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

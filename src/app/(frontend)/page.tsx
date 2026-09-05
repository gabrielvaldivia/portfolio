import { ProjectCard } from '@/components/ProjectCard'
import { Testimonial } from '@/components/Testimonial'
import { RichText } from '@/components/RichText'
import { ServicePill } from '@/components/ServicePill'
import { HScrollContainer } from '@/components/HScrollContainer'
import { normalizeSocialLink } from '@/lib/socialLinks'
import { ContactForm } from '@/components/ContactForm'
import { AskMeAnything, AskMeAnythingRestart } from '@/components/AskMeAnything'
import { HeroProjectSlideshow } from '@/components/HeroProjectSlideshow'
import { LikedWorkMarquee, type LikedWorkMarqueeItem } from '@/components/LikedWorkMarquee'
import { ApproachTimelineItem } from '@/components/ApproachTimelineItem'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPageBySlug } from '@/lib/queries'
import { getPayload, isPayloadUnavailable } from '@/lib/payload'
import { getFAQItemsFromSections } from '@/lib/buildContext'
import { getModuleLikeFeed } from '@/lib/moduleLikeActivity'
import { cn } from '@/lib/cn'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 300

const PUBLIC_CMS_API = 'https://www.gabrielvaldivia.com/api'
const HOME_HERO_TAGLINE = 'Your design partner for first-generation products.'

function HomeContainer({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return <div id={id} className={`w-full px-5 tablet:px-10 ${className}`}>{children}</div>
}

async function getPublicHomepagePreview() {
  const request = async (path: string) => {
    const response = await fetch(`${PUBLIC_CMS_API}${path}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Public CMS request failed with ${response.status}`)
    return response.json()
  }

  const requestAllLikedWork = async () => {
    const items: any[] = []
    let nextCursor: any = null

    do {
      const params = new URLSearchParams({ view: 'feed', limit: '100' })
      if (nextCursor) {
        params.set('cursorLikeCount', String(nextCursor.likeCount))
        params.set('cursorUpdatedAt', String(nextCursor.updatedAt))
        params.set('cursorTargetId', String(nextCursor.targetId))
      }

      const page = await request(`/activity?${params.toString()}`)
      items.push(...(Array.isArray(page.items) ? page.items : []))
      nextCursor = page.nextCursor || null
    } while (nextCursor)

    return items
  }

  const [pageResult, services, projectsResult, likedWorkResult] = await Promise.all([
    request('/pages?where%5Bslug%5D%5Bequals%5D=home&depth=3&limit=1'),
    request('/services?where%5Bfeatured%5D%5Bequals%5D=true&sort=order&depth=0&limit=20'),
    request('/projects?depth=3&limit=100&sort=order&where%5Bhide%5D%5Bnot_equals%5D=true'),
    requestAllLikedWork().catch((error) => {
      console.warn('Public liked work preview unavailable.', error)
      return []
    }),
  ])

  return [pageResult, services, { docs: [] }, projectsResult, likedWorkResult] as const
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('home')

  return buildPageMetadata(page, {
    fallbackTitle: 'Gabriel Valdivia',
    fallbackDescription: 'Fractional design partner for early-stage teams.',
    appendSiteName: false,
  })
}

function normalizeAskedQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitApproachItem(item: any, index: number) {
  const data = item.text
  const rootChildren = data?.root?.children
  const paragraphIndex = Array.isArray(rootChildren)
    ? rootChildren.findIndex((node: any) => node?.type === 'paragraph' && Array.isArray(node.children))
    : -1
  const paragraph = paragraphIndex >= 0 ? rootChildren[paragraphIndex] : null
  const paragraphChildren = paragraph?.children
  const lead = Array.isArray(paragraphChildren) ? paragraphChildren[0] : null
  const leadIsBoldText = lead?.type === 'text'
    && typeof lead.text === 'string'
    && (Number(lead.format) & 1) === 1
  const extractedTitle = leadIsBoldText ? lead.text.trim() : ''
  const title = typeof item.title === 'string' && item.title.trim()
    ? item.title.trim()
    : extractedTitle || `Step ${index + 1}`

  if (!leadIsBoldText) return { title, description: data }

  const remainingChildren = paragraphChildren.slice(1)
  if (remainingChildren[0]?.type === 'text' && typeof remainingChildren[0].text === 'string') {
    remainingChildren[0] = {
      ...remainingChildren[0],
      text: remainingChildren[0].text.trimStart(),
    }
  }

  return {
    title,
    description: {
      ...data,
      root: {
        ...data.root,
        children: rootChildren.map((node: any, nodeIndex: number) => (
          nodeIndex === paragraphIndex
            ? { ...node, children: remainingChildren }
            : node
        )),
      },
    },
  }
}

function relationName(value: any) {
  return typeof value === 'object' && value !== null && typeof value.name === 'string'
    ? value.name
    : ''
}

function normalizeEntityName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function buildHeroProjectSlides(projects: any[], testimonials: any[]) {
  const matchedTestimonials = projects.map((project) => {
    const teamMatch = Array.isArray(project.team)
      ? project.team.find((person: any) => typeof person === 'object' && person?.testimonial)
      : null
    if (teamMatch) return teamMatch

    const clientName = normalizeEntityName(relationName(project.client))
    if (!clientName) return null

    return testimonials.find((testimonial: any) => (
      normalizeEntityName(relationName(testimonial.company)) === clientName
    )) || null
  })

  return projects.map((project, index) => {
    const testimonial = matchedTestimonials[index]
    const projectId = String(project.id || project.slug || index)
    const testimonialQuote = typeof project.heroTestimonialQuote === 'string'
      ? project.heroTestimonialQuote.trim()
      : ''
    const testimonialName = typeof project.heroTestimonialName === 'string'
      ? project.heroTestimonialName.trim()
      : ''

    return {
      id: projectId,
      title: project.title,
      slug: project.slug,
      subtitle: project.subtitle || undefined,
      gradientColor: typeof project.heroGradientColor === 'string'
        ? project.heroGradientColor
        : undefined,
      featuredImage: typeof project.featuredImage === 'object' && project.featuredImage?.url
        ? {
            url: project.featuredImage.url,
            alt: project.featuredImage.alt,
            mimeType: project.featuredImage.mimeType,
          }
        : undefined,
      testimonial: testimonialQuote
        ? {
            id: `${projectId}-testimonial-override`,
            quote: testimonialQuote,
            name: testimonialName || testimonial?.name || project.title,
          }
        : testimonial?.testimonial
        ? {
            id: String(testimonial.id || `${project.id || index}-testimonial`),
            quote: testimonial.testimonial,
            name: testimonial.name,
          }
        : undefined,
    }
  })
}

function resolveHeroProjects(slides: any[], projects: any[]) {
  const projectsById = new Map(projects.map((project) => [String(project.id), project]))

  return slides.flatMap((slide) => {
    const project = typeof slide.project === 'object' && slide.project !== null
      ? slide.project
      : projectsById.get(String(slide.project))
    if (!project?.slug) return []

    const image = typeof slide.image === 'object' && slide.image?.url
      ? slide.image
      : project.featuredImage

    return [{
      ...project,
      title: typeof slide.title === 'string' && slide.title.trim()
        ? slide.title.trim()
        : project.title,
      subtitle: typeof slide.description === 'string' && slide.description.trim()
        ? slide.description.trim()
        : project.subtitle,
      featuredImage: image,
      heroGradientColor: typeof slide.gradientColor === 'string' && slide.gradientColor.trim()
        ? slide.gradientColor.trim()
        : undefined,
      heroTestimonialQuote: slide.testimonialQuote,
      heroTestimonialName: slide.testimonialName,
    }]
  })
}

function buildLikedWorkMarqueeItems(items: any[]): LikedWorkMarqueeItem[] {
  return items.flatMap((item, index) => {
    const target = item?.target
    const thumbnail = target?.thumbnail
    const type = thumbnail?.type
    const url = typeof thumbnail?.url === 'string' ? thumbnail.url : ''
    const href = typeof target?.href === 'string' ? target.href : ''
    const likeCount = Math.max(0, Math.trunc(Number(item.likeCount) || 0))

    if (
      (type !== 'image' && type !== 'video')
      || !url
      || !href
      || href === '#'
      || likeCount < 1
      || href.startsWith('/photo/')
    ) return []

    const frame = thumbnail.frame?.url && thumbnail.frame?.aspectRatio
      ? {
          id: String(thumbnail.frame.id || 'frame'),
          url: String(thumbnail.frame.url),
          aspectRatio: String(thumbnail.frame.aspectRatio),
          screen: thumbnail.frame.screen || {},
        }
      : undefined
    const width = Number(thumbnail.width)
    const height = Number(thumbnail.height)
    const numericMediaAspectRatio = width > 0 && height > 0 ? width / height : 4 / 3
    const isBrowserModule = target?.block?.blockType === 'browser'
    const isPhoneFrame = frame?.id.startsWith('iphone') === true
    const cropTallImage = type === 'image' && !frame && numericMediaAspectRatio < 1
    const mediaAspectRatio = width > 0 && height > 0 ? `${width} / ${height}` : '4 / 3'
    const isWebsiteCard = Boolean(thumbnail.imageBorder && thumbnail.padding)
    const aspectRatio = isPhoneFrame
      ? '1 / 1'
      : isBrowserModule || isWebsiteCard
      ? '4 / 3'
      : cropTallImage
        ? '1 / 1'
        : frame?.aspectRatio || mediaAspectRatio

    return [{
      id: String(item.id || item.targetId || index),
      href,
      title: String(target.label || target.sourceTitle || 'Work'),
      likeCount,
      aspectRatio,
      thumbnail: {
        type,
        url,
        alt: String(thumbnail.alt || target.label || target.sourceTitle || ''),
        width: width > 0 ? width : undefined,
        height: height > 0 ? height : undefined,
        fit: thumbnail.fit === 'contain' ? 'contain' as const : 'cover' as const,
        padding: typeof thumbnail.padding === 'string' ? thumbnail.padding : undefined,
        backgroundColor: typeof thumbnail.backgroundColor === 'string'
          ? thumbnail.backgroundColor
          : undefined,
        imageBorder: Boolean(thumbnail.imageBorder),
        rounded: Boolean(thumbnail.rounded),
        cropFromTop: cropTallImage,
        browser: isBrowserModule
          ? {
              address: typeof target.block?.address === 'string'
                ? target.block.address
                : undefined,
            }
          : undefined,
        frame,
      },
    }]
  })
}

function SectionWithTitle({
  title,
  children,
  titleRight,
  titleRightInline = false,
}: {
  title?: string
  children: React.ReactNode
  titleRight?: React.ReactNode
  titleRightInline?: boolean
}) {
  return (
    <div className="home-section-layout">
      <div className={cn('flex items-start', titleRightInline ? 'gap-2' : 'justify-between gap-5')}>
        {title && <h3 className="text-balance">{title}</h3>}
        {titleRight}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function HomeHeroTagline({ heading = HOME_HERO_TAGLINE }: { heading?: string | null }) {
  const lines = (heading?.trim() || HOME_HERO_TAGLINE).split(/\r?\n/)

  return (
    <div className="hero-intro-snap-point px-5 tablet:px-10 tablet:pt-20 desktop:pt-24">
      <h1
        aria-label={lines.join(' ')}
        className="home-hero-heading max-w-[1120px] text-left"
      >
        {lines.map((line, index) => (
          <span
            key={`${line}-${index}`}
            aria-hidden="true"
            className={lines.length > 1 ? 'tablet:block tablet:whitespace-nowrap' : undefined}
          >
            {line}{index < lines.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>
    </div>
  )
}

export default async function HomePage() {
  const payload = await getPayload()
  const usePublicPreview = process.env.NODE_ENV === 'development' && isPayloadUnavailable(payload)
  const [pageResult, services, conversationsResult, projectsResult, likedWorkResult] = usePublicPreview
    ? await getPublicHomepagePreview().catch((error) => {
        console.error('Public homepage preview unavailable.', error)
        return [{ docs: [] }, { docs: [] }, { docs: [] }, { docs: [] }, []] as const
      })
    : await Promise.all([
        payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, depth: 3, limit: 1 }),
        payload.find({ collection: 'services', sort: 'order', limit: 20, where: { featured: { equals: true } }, select: { title: true } }),
        payload.find({ collection: 'conversations', sort: '-updatedAt', limit: 500, depth: 0, select: { messages: true } }),
        payload.find({ collection: 'projects', sort: 'order', limit: 100, depth: 3, where: { hide: { not_equals: true } } }),
        getModuleLikeFeed(null).catch((error) => {
          console.error('Liked work unavailable.', error)
          return []
        }),
      ])
  const page = pageResult.docs[0] || null
  const sections = (page?.sections || []) as any[]
  const homepageTestimonials = sections.find((section: any) => (
    section.blockType === 'hScroll' && section.source === 'featuredTestimonials'
  ))?.testimonials || []
  const faqItems = getFAQItemsFromSections(sections)
  const likedWorkItems = buildLikedWorkMarqueeItems(likedWorkResult as any[])
  const questionCounts = new Map<string, { question: string; count: number }>()

  for (const conversation of conversationsResult.docs as any[]) {
    for (const message of Array.isArray(conversation.messages) ? conversation.messages : []) {
      if (message?.role !== 'user' || typeof message.content !== 'string') continue
      const question = message.content.trim()
      const normalized = normalizeAskedQuestion(question)
      if (normalized.length < 8 || normalized.length > 160 || /@|https?:\/\//i.test(question)) continue
      const existing = questionCounts.get(normalized)
      questionCounts.set(normalized, {
        question: existing?.question || question,
        count: (existing?.count || 0) + 1,
      })
    }
  }

  const suggestedQuestions = [...questionCounts.entries()]
    .filter(([, entry]) => entry.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([normalized, entry]) => {
      const authored = faqItems.find((item) => normalizeAskedQuestion(item.question) === normalized)
      return { question: entry.question, answer: authored?.answer || '' }
    })

  for (const item of faqItems.filter((faq) => faq.showAsPill !== false)) {
    if (suggestedQuestions.length >= 5) break
    if (suggestedQuestions.some((question) => normalizeAskedQuestion(question.question) === normalizeAskedQuestion(item.question))) continue
    suggestedQuestions.push(item)
  }

  if (!sections.length) {
    return (
      <>
        <section id="hero" className="scroll-mt-0">
          <HomeHeroTagline />
        </section>
        <div className="h-20 tablet:h-28 desktop:h-[200px]" />
      </>
    )
  }

  function renderSection(block: any, i: number, options?: { heroSlideshow?: boolean }) {
    switch (block.blockType) {
      case 'hero': {
        const heroProjects = resolveHeroProjects(block.slides || [], projectsResult.docs as any[])
        return (
          <div key={block.id || i} id="hero" className="scroll-mt-0">
            <HomeHeroTagline heading={block.heading} />
            {heroProjects.length ? (
              <div className="mt-4 min-w-0 tablet:mt-[123px] desktop:mt-[133px]">
                <HeroProjectSlideshow
                  projects={buildHeroProjectSlides(heroProjects, homepageTestimonials)}
                />
              </div>
            ) : null}
          </div>
        )
      }

      case 'hScroll': {
        const items = block.source === 'featuredProjects' ? (block.projects || []) : (block.testimonials || [])
        if (!items.length) return null
        const fw = block.fullWidth
        const heroSlideshow = options?.heroSlideshow === true

        if (heroSlideshow) {
          return (
            <HeroProjectSlideshow
              key={block.id || i}
              projects={buildHeroProjectSlides(items, homepageTestimonials)}
            />
          )
        }

        const horizontalContent = fw ? (
            <HScrollContainer maskOnMobile={false}>
              <div className="flex w-max items-stretch gap-5 pr-5 tablet:pr-10 desktop:gap-6">
                {items.map((item: any, idx: number) => (
                  <div key={item.id} className="w-[320px] shrink-0 tablet:w-[440px] desktop:w-[420px]">
                    {block.source === 'featuredProjects' ? (
                      <ProjectCard
                        title={item.title}
                        slug={item.slug}
                        subtitle={item.subtitle}
                        featuredImage={item.featuredImage}
                        priority={idx === 0}
                      />
                    ) : (
                      <Testimonial
                        quote={item.testimonial}
                        name={item.name}
                        company={typeof item.company === 'object' ? item.company?.name : item.company}
                        companyLogo={typeof item.company === 'object' ? item.company?.logo : null}
                        photo={item.photo}
                        linkedIn={item.linkedIn}
                      />
                    )}
                  </div>
                ))}
                {block.source === 'featuredProjects' && (
                  <div className="w-[320px] shrink-0 tablet:w-[440px] desktop:w-[420px]">
                    <ProjectCard title="Index" slug="" subtitle="View all projects" href="/work" icon={
                      <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none"><path d="M21 31C15.477 31 11 35.477 11 41V159C11 164.523 15.477 169 21 169H179C184.523 169 189 164.523 189 159V61.361C189 55.838 184.523 51.361 179 51.361H84.081C83.022 51.361 82.006 50.94 81.256 50.192L64.947 33.921C63.072 32.05 60.532 31 57.884 31H21Z" stroke="currentColor" strokeWidth="2"/></svg>
                    } />
                  </div>
                )}
              </div>
            </HScrollContainer>
          ) : (
            <HScrollContainer snap maskOnMobile={false} dots>
              <div className="flex w-max items-stretch gap-8 pr-5 tablet:gap-10 tablet:pr-10">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="shrink-0 w-[calc(100vw-40px)] tablet:w-[480px] snap-center"
                  >
                    {block.source === 'featuredProjects' ? (
                      <ProjectCard
                        title={item.title}
                        slug={item.slug}
                        subtitle={item.subtitle}
                        featuredImage={item.featuredImage}
                      />
                    ) : (
                      <Testimonial
                        quote={item.testimonial}
                        name={item.name}
                        company={typeof item.company === 'object' ? item.company?.name : item.company}
                        companyLogo={typeof item.company === 'object' ? item.company?.logo : null}
                        photo={item.photo}
                        linkedIn={item.linkedIn}
                      />
                    )}
                  </div>
                ))}
                {block.source === 'featuredProjects' && (
                  <div className="shrink-0 w-[calc(100vw-40px)] tablet:w-[480px] snap-start">
                    <ProjectCard title="Index" slug="" subtitle="View all projects" href="/work" icon={
                      <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none"><path d="M21 31C15.477 31 11 35.477 11 41V159C11 164.523 15.477 169 21 169H179C184.523 169 189 164.523 189 159V61.361C189 55.838 184.523 51.361 179 51.361H84.081C83.022 51.361 82.006 50.94 81.256 50.192L64.947 33.921C63.072 32.05 60.532 31 57.884 31H21Z" stroke="currentColor" strokeWidth="2"/></svg>
                    } />
                  </div>
                )}
              </div>
            </HScrollContainer>
          )

        return (
          <section key={block.id || i}>
            <HomeContainer>
              <SectionWithTitle title={block.title}>
                {horizontalContent}
              </SectionWithTitle>
            </HomeContainer>
          </section>
        )
      }

      case 'pillGrid':
        if (!services.docs.length) return null
        return (
          <HomeContainer key={block.id || i}>
            <SectionWithTitle title={block.title || 'Capabilities'}>
              <div className="flex flex-wrap gap-3">
                {services.docs.map((service: any) => (
                  <ServicePill key={service.id} title={service.title} />
                ))}
              </div>
            </SectionWithTitle>
          </HomeContainer>
        )

      case 'numberedGrid': {
        const items = (block.items || []) as any[]
        if (!items.length) return null
        return (
          <HomeContainer key={block.id || i} className="hero-approach-snap-point">
            <h2 className="text-balance">{block.title || 'Approach'}</h2>
            <ol className="mt-16 flex list-none flex-col gap-16 p-0 tablet:mt-24 tablet:gap-20 desktop:mt-32 desktop:gap-24">
              {items.map((item: any, j: number) => {
                const { title, description } = splitApproachItem(item, j)

                return (
                  <ApproachTimelineItem
                    key={item.id || j}
                    index={j}
                    title={title}
                  >
                    <div className="home-approach-copy ml-10 max-w-[900px] text-body-large text-pretty tablet:ml-0">
                      <RichText data={description} />
                    </div>
                  </ApproachTimelineItem>
                )
              })}
            </ol>
          </HomeContainer>
        )
      }

      case 'marqueeSection': {
        if (!likedWorkItems.length) return null

        return (
          <section key={block.id || i}>
            <HomeContainer>
              <div className="flex items-baseline justify-between gap-5">
                <h2 className="text-balance">Work</h2>
                <Link
                  href="/work"
                  className="inline-flex items-center gap-1 rounded-sm text-body text-muted transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
                >
                  See all
                  <svg
                    aria-hidden="true"
                    className="size-4 shrink-0 translate-y-px"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </Link>
              </div>
            </HomeContainer>
            <div className="mt-10 tablet:mt-12 desktop:mt-16">
              <LikedWorkMarquee items={likedWorkItems} />
            </div>
          </section>
        )
      }

      case 'accordion': {
        return (
          <HomeContainer key={block.id || i} className="h-full scroll-mt-5 tablet:scroll-mt-32" id="ask-me-anything">
            <SectionWithTitle
              title={block.title || 'Ask me anything'}
              titleRight={<AskMeAnythingRestart />}
              titleRightInline
            >
              <div className="min-h-0 tablet:flex-1">
                <AskMeAnything items={faqItems} suggestedQuestions={suggestedQuestions.slice(0, 5)} />
              </div>
            </SectionWithTitle>
          </HomeContainer>
        )
      }

      case 'callout':
        return (
          <section key={block.id || i} id="contact" className="h-full scroll-mt-10">
            <HomeContainer>
              <SectionWithTitle title={block.heading}>
                <div className="bg-background-alt rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] p-6 tablet:p-8 desktop:p-10 h-full">
                  {block.text && (
                    <div className="text-muted text-body text-pretty">
                      <RichText data={block.text} />
                    </div>
                  )}
                  {block.availability && (
                    <a href="mailto:gabe@valdivia.works" className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border mt-8 hover:border-muted transition-colors">
                      <span className="relative flex size-2"><span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" /><span className="relative size-2 rounded-full bg-green-500" /></span>
                      <span className="text-sm text-muted group-hover:text-content transition-colors">{block.availability}</span>
                    </a>
                  )}
                </div>
              </SectionWithTitle>
            </HomeContainer>
          </section>
        )

      case 'socialLinks': {
        const links = ((block.links || []) as any[]).map(normalizeSocialLink)
        if (!links.length) return null
        const emailLink = links.find((link: any) => ['email', 'mail'].includes(link.platform?.toLowerCase()))
        const email = emailLink?.url?.replace(/^mailto:/i, '') || 'gabe@valdivia.works'
        return (
          <section key={block.id || i} id="contact" className="h-full scroll-mt-5 tablet:scroll-mt-32">
            <HomeContainer>
              <div className="flex flex-col items-center gap-10 tablet:gap-12 desktop:gap-16">
                <h2 className="contact-prompt max-w-4xl text-balance text-center font-normal">
                  Building something new? Let&apos;s talk.
                </h2>
                <div className="w-full max-w-[720px] rounded-[20px] bg-background-alt p-6 tablet:rounded-[30px] tablet:p-8 desktop:rounded-[40px] desktop:p-10">
                  <ContactForm email={email} />
                </div>
              </div>
            </HomeContainer>
          </section>
        )
      }

      default:
        return null
    }
  }

  return (
    <>

      {(() => {
        const groups: { blocks: any[] }[] = []
        sections
          .filter((block: any) => (
            block.blockType !== 'aboutSection'
            && block.blockType !== 'accordion'
            && !(block.blockType === 'hScroll' && block.source === 'featuredTestimonials')
          ))
          .forEach((block: any) => {
            const cols = block.columns || '6'
            if (cols !== '6') {
              const lastGroup = groups[groups.length - 1]
              const lastBlock = lastGroup?.blocks[lastGroup.blocks.length - 1]
              const lastBlockCols = lastBlock ? (lastBlock.columns || '6') : '6'
              // Group consecutive non-full-width blocks together
              if (lastGroup && lastBlockCols !== '6') {
                lastGroup.blocks.push(block)
              } else {
                groups.push({ blocks: [block] })
              }
            } else {
              groups.push({ blocks: [block] })
            }
          })

        return groups.map((group, gi) => {
          const isGrid = group.blocks.length > 1 || (group.blocks[0]?.columns || '6') !== '6'
          const blockType = group.blocks[0]?.blockType
          const previousBlock = gi > 0
            ? groups[gi - 1].blocks[groups[gi - 1].blocks.length - 1]
            : null
          const prevBlockType = previousBlock?.blockType
          const nextGroup = groups[gi + 1]
          const nextBlock = nextGroup?.blocks[0]
          const isHeroShowcase = blockType === 'hero'
            && group.blocks.length === 1
            && !(group.blocks[0]?.slides || []).length
            && nextGroup?.blocks.length === 1
            && nextBlock?.blockType === 'hScroll'
            && nextBlock?.source === 'featuredProjects'
          const isPairedHeroSlideshow = blockType === 'hScroll'
            && group.blocks.length === 1
            && group.blocks[0]?.source === 'featuredProjects'
            && prevBlockType === 'hero'

          if (isPairedHeroSlideshow) return null

          if (isHeroShowcase) {
            return (
              <div key={gi} id="hero" className="scroll-mt-0">
                <HomeHeroTagline heading={group.blocks[0]?.heading} />
                <div className="mt-4 min-w-0 tablet:mt-[123px] desktop:mt-[133px]">
                  {renderSection(nextBlock, gi * 100, { heroSlideshow: true })}
                </div>
              </div>
            )
          }

          const isHeroFollowUp = blockType === 'hScroll' && prevBlockType === 'hero'
          return (
            <div
              key={gi}
              className={cn(
                isHeroFollowUp && 'mt-10 tablet:mt-16 desktop:mt-20',
                gi > 0 && !isHeroFollowUp && 'mt-20 tablet:mt-28 desktop:mt-[200px]',
              )}
            >
              {isGrid ? (
                <HomeContainer>
                  <div className="grid grid-cols-1 tablet:grid-cols-6 tablet:auto-rows-[200px] gap-5 tablet:gap-10" style={{ gridAutoFlow: 'dense' }}>
                    {group.blocks.map((block: any, bi: number) => {
                      const cols = block.columns || '6'
                      const rowsVal = block.rows && block.rows !== 'auto' ? parseInt(block.rows) : null
                      const spanMap: Record<string, string> = { '1': 'tablet:col-span-1', '2': 'tablet:col-span-2', '3': 'tablet:col-span-3', '4': 'tablet:col-span-4', '5': 'tablet:col-span-5', '6': 'tablet:col-span-6' }
                      const rowSpanMap: Record<string, string> = { '1': 'tablet:row-span-1', '2': 'tablet:row-span-2', '3': 'tablet:row-span-3', '4': 'tablet:row-span-4', '5': 'tablet:row-span-5', '6': 'tablet:row-span-6', '7': 'tablet:row-span-7', '8': 'tablet:row-span-8', '9': 'tablet:row-span-9', '10': 'tablet:row-span-10' }
                      const spanClass = spanMap[cols] || 'tablet:col-span-6'
                      const rowSpanClass = rowsVal ? (rowSpanMap[String(rowsVal)] || '') : ''
                      return (
                        <div key={block.id || `${gi}-${bi}`} className={`${spanClass} ${rowSpanClass}`}>
                          {renderSection(block, gi * 100 + bi)}
                        </div>
                      )
                    })}
                  </div>
                </HomeContainer>
              ) : group.blocks[0].rows && group.blocks[0].rows !== 'auto' ? (
                <div style={{ height: `${parseInt(group.blocks[0].rows) * 200 + (parseInt(group.blocks[0].rows) - 1) * 40}px` }}>
                  {renderSection(group.blocks[0], gi)}
                </div>
              ) : (
                renderSection(group.blocks[0], gi)
              )}
            </div>
          )
        })
      })()}

      <div className="h-20 tablet:h-28 desktop:h-[200px]" />
    </>
  )
}

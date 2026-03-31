import { Container } from '@/components/Container'
import { ProjectCard } from '@/components/ProjectCard'
import { Testimonial } from '@/components/Testimonial'
import { RichText } from '@/components/RichText'
import { ServicePill } from '@/components/ServicePill'
import { HScrollContainer } from '@/components/HScrollContainer'
import { MomentumScroll } from '@/components/MomentumScroll'
import { FitText } from '@/components/FitText'
import { SocialIcon } from '@/components/Icons'
import { Chat } from '@/components/Chat'
import { getPageBySlug, getClients, getFeaturedTestimonials } from '@/lib/queries'
import { getPayload } from '@/lib/payload'
import { buildContext } from '@/lib/buildContext'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = 300

function SectionWithTitle({ title, cols, children, titleRight }: { title?: string; cols: string; children: React.ReactNode; titleRight?: React.ReactNode }) {
  if (!title) return <>{children}</>
  if (cols === '6') {
    return (
      <div className="flex flex-col tablet:grid tablet:grid-cols-6 gap-5 tablet:gap-10">
        <div className="tablet:col-span-2 flex items-start justify-between">
          <h3>{title}</h3>
          {titleRight}
        </div>
        <div className="tablet:col-span-4">{children}</div>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-start justify-between pb-5 tablet:pb-10">
        <h3>{title}</h3>
        {titleRight}
      </div>
      {children}
    </div>
  )
}

export default async function HomePage() {
  const page = await getPageBySlug('home')
  const payload = await getPayload()
  const services = await payload.find({ collection: 'services', sort: 'order', limit: 20, where: { featured: { equals: true } } })
  const { docs: clients } = await getClients()
  const { docs: testimonials } = await getFeaturedTestimonials()
  const { faqItems } = await buildContext()
  const allProjects = await payload.find({ collection: 'projects', sort: 'order', limit: 100, depth: 0 })
  const projectLinks = allProjects.docs.map((p: any) => ({ title: p.title, slug: p.slug }))
  const allPeople = await payload.find({ collection: 'people', limit: 100, depth: 0 })
  const peopleLinks = allPeople.docs.filter((p: any) => p.linkedIn).map((p: any) => ({ name: p.name, linkedin: p.linkedIn }))
  const allSideProjects = await payload.find({ collection: 'side-projects', sort: 'order', limit: 100, depth: 0 })
  const sideProjectLinks = allSideProjects.docs.filter((p: any) => p.slug).map((p: any) => ({ title: p.title, slug: p.slug }))
  const aboutPage = await payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, depth: 0, limit: 1 })
  const aboutData = aboutPage.docs[0] as any
  const talkLinks = [
    ...((aboutData?.talks || []) as any[]).filter((t: any) => t.url).map((t: any) => ({ title: t.title, url: t.url })),
    ...((aboutData?.interviews || []) as any[]).filter((t: any) => t.url).map((t: any) => ({ title: t.title, url: t.url })),
  ]

  const sections = (page?.sections || []) as any[]
  const aboutSection = sections.find((s: any) => s.blockType === 'aboutSection')
  const aboutImage = aboutSection?.image?.url || ''
  const aboutImageDark = aboutSection?.imageDark?.url || ''
  const chatBlock = sections.find((s: any) => s.blockType === 'accordion')
  const socialLinks = (chatBlock?.links || []).map((l: any) => ({
    platform: l.platform,
    url: l.url,
  }))

  function renderSection(block: any, i: number) {
    const cols = block.columns || '6'

    switch (block.blockType) {
      case 'hero':
        return (
          <section key={block.id || i} id="hero" className="scroll-mt-0 pt-0 tablet:pt-[60px] tablet:pb-[60px] desktop:pt-20 desktop:pb-0 tablet:mb-[-80px]">
            {block.fullWidth ? (
              <div className="px-5 tablet:px-10">
                <h1 className="text-[34px] tablet:hidden">{block.heading}</h1>
                <div className="hidden tablet:block">
                  <FitText className="font-heading">
                    {block.heading}
                  </FitText>
                </div>
              </div>
            ) : (
              <Container>
                <h1>{block.heading}</h1>
              </Container>
            )}
          </section>
        )

      case 'hScroll': {
        const items = block.source === 'featuredProjects' ? (block.projects || []) : testimonials
        if (!items.length) return null
        const fw = block.fullWidth
        return (
          <section key={block.id || i}>
            {block.title && (
              <Container><h3 className="pb-5 tablet:pb-10">{block.title}</h3></Container>
            )}
            {fw ? (
            <HScrollContainer maskOnMobile={false}>
                <div
                  className={`flex items-stretch w-max gap-5 desktop:gap-[24px] px-5 tablet:px-10`}
                >
                  {items.map((item: any, idx: number) => (
                    <div
                      key={item.id}
                      className="shrink-0 w-[320px] tablet:w-[440px] desktop:w-[420px]"
                    >
                      {block.source === 'featuredProjects' ? (
                        <ProjectCard
                          title={item.title}
                          slug={item.slug}
                          subtitle={item.subtitle}
                          featuredImage={item.featuredImage}
                          year={item.year}
                          priority={idx === 0}
                        />
                      ) : (
                        <Testimonial
                          quote={item.testimonial}
                          name={item.name}
                          role={item.role}
                          company={typeof item.company === 'object' ? item.company?.name : item.company}
                          photo={item.photo}
                          linkedIn={item.linkedIn}
                        />
                      )}
                    </div>
                  ))}
                  {block.source === 'featuredProjects' && (
                    <div className="shrink-0 w-[320px] tablet:w-[440px] desktop:w-[420px]">
                      <ProjectCard title="Index" slug="" subtitle="View all projects" href="/work" icon={
                        <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none"><path d="M21 31C15.477 31 11 35.477 11 41V159C11 164.523 15.477 169 21 169H179C184.523 169 189 164.523 189 159V61.361C189 55.838 184.523 51.361 179 51.361H84.081C83.022 51.361 82.006 50.94 81.256 50.192L64.947 33.921C63.072 32.05 60.532 31 57.884 31H21Z" stroke="currentColor" strokeWidth="2"/></svg>
                      } />
                    </div>
                  )}
                </div>
            </HScrollContainer>
            ) : (
            <HScrollContainer className="max-w-[1400px] mx-auto" snap maskOnMobile={false} dots>
              <div
                className="flex items-stretch w-max px-5 tablet:px-10 gap-8 tablet:gap-10"
              >
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
                        year={item.year}
                      />
                    ) : (
                      <Testimonial
                        quote={item.testimonial}
                        name={item.name}
                        role={item.role}
                        company={item.company}
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
            )}
          </section>
        )
      }

      case 'aboutSection':
        return (
          <Container key={block.id || i}>
            <div id="about" className="scroll-mt-5 tablet:scroll-mt-32 grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-10 tablet:gap-14 desktop:gap-20">
              <div>
                {block.image && (
                  <div className="rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] overflow-hidden aspect-square tablet:aspect-[3/4] relative after:absolute after:inset-0 after:rounded-[20px] tablet:after:rounded-[30px] desktop:after:rounded-[40px] after:border after:border-border after:z-20 after:pointer-events-none">
                    <Image
                      src={block.image.url}
                      alt={block.image.alt || 'About'}
                      fill
                      className={`object-cover ${block.imageDark ? 'light-only' : ''}`}
                      sizes="(max-width: 1280px) 100vw, 33vw"
                    />
                    {block.imageDark && (
                      <Image
                        src={block.imageDark.url}
                        alt={block.imageDark.alt || 'About'}
                        fill
                        className="object-cover dark-only"
                        sizes="(max-width: 1280px) 100vw, 33vw"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="tablet:col-span-1 desktop:col-span-2">
                {block.heading && <h2 className="text-[22px] tablet:text-[28px] desktop:text-[36px] pb-5 tablet:pb-10">{block.heading}</h2>}
                {block.text && (
                  <div className="text-muted text-body-large">
                    <RichText data={block.text} />
                  </div>
                )}
                <Link href="/about" className="text-muted hover:opacity-50 transition-opacity inline-flex items-center gap-1 -mt-2">
                  Learn more
                  <svg className="shrink-0 translate-y-[2px]" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
                </Link>
              </div>
            </div>
          </Container>
        )

      case 'pillGrid':
        if (!services.docs.length) return null
        return (
          <Container key={block.id || i}>
            <SectionWithTitle title={block.title || 'Capabilities'} cols={cols}>
              <div className="flex flex-wrap gap-3">
                {services.docs.map((service: any) => (
                  <ServicePill key={service.id} title={service.title} />
                ))}
              </div>
            </SectionWithTitle>
          </Container>
        )

      case 'numberedGrid': {
        const items = (block.items || []) as any[]
        if (!items.length) return null
        return (
          <Container key={block.id || i}>
            <h3 className="pb-5 tablet:pb-10">{block.title || 'Approach'}</h3>
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6 tablet:gap-10 desktop:gap-20">
                {items.map((item: any, j: number) => (
                  <div key={j} className="flex gap-5 items-start">
                    <span className="text-content opacity-50 text-[20px] shrink-0 w-[28px] tabular-nums">{String(j + 1).padStart(2, '0')}</span>
                    <div className="text-body">
                      <RichText data={item.text} />
                    </div>
                  </div>
                ))}
              </div>
          </Container>
        )
      }

      case 'marqueeSection': {
        const hiddenFromMarquee = ['Jigsaw', 'Google']
        const marqueeClients = ((block.clients as any[])?.length ? (block.clients as any[]) : clients)
          .filter((c: any) => !hiddenFromMarquee.includes(c.name))
        if (!marqueeClients.length) return null
        return (
          <section key={block.id || i}>
            <Container>
              <div className="flex items-center justify-between pb-5 tablet:pb-10">
                <h3>{block.title || 'Clients'}</h3>
                {block.linkUrl && (
                  <Link href={block.linkUrl} className="text-muted hover:opacity-60 transition-colors inline-flex items-center gap-1">
                    {block.linkText || 'View all'}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4" /></svg>
                  </Link>
                )}
              </div>
            </Container>
            <div className="max-w-[1400px] mx-auto overflow-hidden hscroll-masked">
              <div className="marquee">
                <div
                  className="marquee-track"
                  style={{
                    gap: `${block.gap || 60}px`,
                    '--marquee-speed': `${block.speed || 60}s`,
                  } as React.CSSProperties}
                >
                  {[...marqueeClients, ...marqueeClients].map((client: any, j: number) => {
                    const logo = client.logo as any
                    return logo?.url ? (
                      <img
                        key={j}
                        src={logo.url}
                        alt={logo.alt || client.name}
                        className="shrink-0 dark-invert"
                        loading="lazy"
                        style={{
                          height: `clamp(24px, 4vw, ${(block.fontSize || 48) * 0.6}px)`,
                          width: 'auto',
                          opacity: (block.opacity || 30) / 100,
                        }}
                      />
                    ) : (
                      <span
                        key={j}
                        className="text-content font-heading whitespace-nowrap"
                        style={{
                          fontSize: `clamp(24px, 5vw, ${block.fontSize || 48}px)`,
                          opacity: (block.opacity || 30) / 100,
                        }}
                      >
                        {client.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )
      }

      case 'accordion': {
        const isFullWidth = cols === '6'
        return (
          <Container key={block.id || i} className="h-full scroll-mt-5 tablet:scroll-mt-32" id="contact">
            {isFullWidth ? (
              <div className="flex flex-col tablet:grid tablet:grid-cols-6 gap-5 tablet:gap-10 h-full">
                {block.title && <div className="tablet:col-span-2 flex items-start"><h3>{block.title}</h3></div>}
                <div className="tablet:col-span-4 bg-background-alt rounded-[20px] tablet:rounded-[30px] p-5 tablet:p-8 tablet:h-full tablet:min-h-[400px] overflow-hidden" style={{ height: block.fixedHeight || '70dvh' }}>
                  <Chat faqItems={faqItems} avatarUrl={aboutImage} avatarUrlDark={aboutImageDark} projects={projectLinks} sideProjects={sideProjectLinks} people={peopleLinks} socialLinks={socialLinks} talks={talkLinks} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {block.title && <h3 className="pb-5 tablet:pb-10">{block.title}</h3>}
                <div className="bg-background-alt rounded-[20px] tablet:rounded-[30px] p-5 tablet:p-8 tablet:flex-1 min-h-0 overflow-hidden" style={{ height: block.fixedHeight || '70dvh' }}>
                  <Chat faqItems={faqItems} avatarUrl={aboutImage} avatarUrlDark={aboutImageDark} projects={projectLinks} sideProjects={sideProjectLinks} people={peopleLinks} socialLinks={socialLinks} talks={talkLinks} />
                </div>
              </div>
            )}
          </Container>
        )
      }

      case 'callout':
        return (
          <div key={block.id || i} id="contact" className="h-full scroll-mt-10">
            <div className="bg-background-alt rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] p-6 tablet:p-8 desktop:p-10 h-full">
            {block.heading && <h3 className="pb-5 tablet:pb-10">{block.heading}</h3>}
            {block.text && (
              <div className="text-muted text-body">
                <RichText data={block.text} />
              </div>
            )}
            {block.availability && (
              <a href="mailto:gabe@valdivia.works" className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border mt-8 hover:border-muted transition-colors">
                <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" /><span className="relative w-2 h-2 rounded-full bg-green-500" /></span>
                <span className="text-sm text-muted group-hover:text-content transition-colors">{block.availability}</span>
              </a>
            )}
            </div>
          </div>
        )

      case 'socialLinks': {
        const links = (block.links || []) as any[]
        if (!links.length) return null
        return (
          <div key={block.id || i} className="h-full">
            <SectionWithTitle title={block.title || 'Elsewhere'} cols={cols}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                {links.map((link: any, j: number) => (
                  <a
                    key={j}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-content transition-colors text-body inline-flex items-baseline gap-3 group"
                  >
                    <span className="shrink-0 w-[18px] flex items-center justify-center translate-y-[2px]"><SocialIcon platform={link.platform} /></span>
                    {link.platform}
                    <svg className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[5px]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                  </a>
                ))}
              </div>
            </SectionWithTitle>
          </div>
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
        sections.forEach((block: any) => {
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
          const prevBlockType = gi > 0 ? groups[gi - 1].blocks[groups[gi - 1].blocks.length - 1]?.blockType : null
          // Keep original spacing between hero and featured projects, consistent spacing elsewhere
          const isHeroFollowUp = blockType === 'hScroll' && prevBlockType === 'hero'
          return (
            <div key={gi}>
              {gi > 0 && (isHeroFollowUp
                ? <div className="h-8 tablet:h-28 desktop:h-[200px]" />
                : <div className="h-20 tablet:h-28 desktop:h-[200px]" />
              )}
              {isGrid ? (
                <Container>
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
                </Container>
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

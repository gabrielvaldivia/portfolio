import { Container } from '@/components/Container'
import { ProjectCard } from '@/components/ProjectCard'
import { Testimonial } from '@/components/Testimonial'
import { FAQ } from '@/components/FAQ'
import { RichText } from '@/components/RichText'
import { ServicePill } from '@/components/ServicePill'
import { HScrollContainer } from '@/components/HScrollContainer'
import { FitText } from '@/components/FitText'
import { getPageBySlug, getClients, getFeaturedTestimonials } from '@/lib/queries'
import { getPayload } from '@/lib/payload'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function SectionWithTitle({ title, cols, children, titleRight }: { title?: string; cols: string; children: React.ReactNode; titleRight?: React.ReactNode }) {
  if (!title) return <>{children}</>
  if (cols === '6') {
    return (
      <div className="flex flex-col tablet:grid tablet:grid-cols-6 gap-10">
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
      <div className="flex items-start justify-between pb-10">
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

  const sections = (page?.sections || []) as any[]

  function renderSection(block: any, i: number) {
    const cols = block.columns || '6'

    switch (block.blockType) {
      case 'hero':
        return (
          <section key={block.id || i} id="hero" className="pt-5 desktop:pt-20 tablet:mb-[-80px]">
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
              <Container><h3 className="pb-10">{block.title}</h3></Container>
            )}
            {fw ? (
            <HScrollContainer>
                <div
                  className={`flex items-stretch w-max gap-[4px] desktop:gap-[24px] px-5 tablet:px-10`}
                >
                  {items.map((item: any) => (
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
                    <div className="shrink-0 w-[320px] tablet:w-[440px] desktop:w-[420px]">
                      <Link href="/work" className="block p-2">
                        <div className="rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] overflow-hidden bg-background-alt flex flex-col">
                          <div className="aspect-square rounded-[14px] tablet:rounded-[26px] desktop:rounded-[32px] overflow-hidden m-1.5 tablet:m-2 flex items-center justify-center">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </div>
                          <div className="px-4 py-3 tablet:px-6 tablet:py-4 desktop:px-8 desktop:py-6">
                            <h3 className="text-content text-[16px] tablet:text-[20px] desktop:text-[24px] leading-[1.3] tracking-[-0.02em]">Index</h3>
                            <p className="text-muted text-[12px] tablet:text-[14px] desktop:text-[16px] mt-0.5 tablet:mt-1">View all projects</p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
            </HScrollContainer>
            ) : (
            <HScrollContainer className="max-w-[1400px] mx-auto" snap maskOnMobile={false} dots>
              <div
                className="flex items-stretch w-max px-5 tablet:px-10 gap-5 tablet:gap-10"
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
              </div>
            </HScrollContainer>
            )}
          </section>
        )
      }

      case 'aboutSection':
        return (
          <Container key={block.id || i}>
            <div id="about" className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-10 tablet:gap-14 desktop:gap-20">
              <div>
                {block.image && (
                  <div className="sticky top-10 rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] overflow-hidden aspect-square tablet:aspect-[3/4] relative">
                    <Image
                      src={block.image.url}
                      alt={block.image.alt || 'About'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 100vw, 33vw"
                    />
                  </div>
                )}
              </div>
              <div className="tablet:col-span-1 desktop:col-span-2">
                {block.heading && <h2 className="pb-10">{block.heading}</h2>}
                {block.text && (
                  <div className="text-muted text-[18px] tablet:text-[22px] desktop:text-[26px] leading-[1.4]">
                    <RichText data={block.text} />
                  </div>
                )}
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
            <h3 className="pb-10">{block.title || 'Approach'}</h3>
              <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6 tablet:gap-10 desktop:gap-20">
                {items.map((item: any, j: number) => (
                  <div key={j} className="flex gap-5 items-start">
                    <span className="text-content opacity-50 text-[20px] shrink-0">{String(j + 1).padStart(2, '0')}</span>
                    <div className="text-[20px] leading-[1.4]">
                      <RichText data={item.text} />
                    </div>
                  </div>
                ))}
              </div>
          </Container>
        )
      }

      case 'marqueeSection': {
        const marqueeClients = (block.clients as any[])?.length ? (block.clients as any[]) : clients
        if (!marqueeClients.length) return null
        return (
          <section key={block.id || i}>
            <Container>
              <div className="flex items-center justify-between pb-10">
                <h3>{block.title || 'Clients'}</h3>
                {block.linkUrl && (
                  <Link href={block.linkUrl} className="text-muted hover:text-content transition-colors">
                    {block.linkText || 'View all'}
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
                  {[...marqueeClients, ...marqueeClients].map((client: any, j: number) => (
                    <span
                      key={j}
                      className="text-content font-heading whitespace-nowrap"
                      style={{
                        fontSize: `${block.fontSize || 48}px`,
                        opacity: (block.opacity || 30) / 100,
                      }}
                    >
                      {client.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )
      }

      case 'accordion': {
        const items = (block.items || []) as any[]
        if (!items.length) return null
        const faqItems = items.map((item: any) => ({ question: item.question, answer: item.answer }))
        return (
          <Container key={block.id || i}>
            <SectionWithTitle title={block.title || 'FAQs'} cols={cols}>
              <FAQ items={faqItems} />
            </SectionWithTitle>
          </Container>
        )
      }

      case 'callout':
        return (
          <div key={block.id || i} id="contact">
            <div className="bg-background-alt rounded-[20px] tablet:rounded-[30px] desktop:rounded-[40px] p-6 tablet:p-8 desktop:p-10">
            {block.heading && <h3 className="pb-10">{block.heading}</h3>}
            {block.text && (
              <div className="text-muted text-[20px] leading-[1.4]">
                <RichText data={block.text} />
              </div>
            )}
            {block.availability && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border mt-8">
                <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" /><span className="relative w-2 h-2 rounded-full bg-green-500" /></span>
                <span className="text-sm text-muted">{block.availability}</span>
              </div>
            )}
            </div>
          </div>
        )

      case 'socialLinks': {
        const links = (block.links || []) as any[]
        if (!links.length) return null
        return (
          <div key={block.id || i} className="p-6 tablet:p-8 desktop:p-10">
            <SectionWithTitle title={block.title || 'Elsewhere'} cols={cols}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8">
                {links.map((link: any, j: number) => (
                  <a
                    key={j}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-content transition-colors text-[20px] inline-flex items-baseline gap-2 group"
                  >
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
      <section className="px-5 tablet:px-10 pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      {(() => {
        const groups: { blocks: any[] }[] = []
        sections.forEach((block: any) => {
          const cols = block.columns || '6'
          if (cols !== '6') {
            const lastGroup = groups[groups.length - 1]
            const lastGroupCols = lastGroup?.blocks.reduce((sum: number, b: any) => sum + parseInt(b.columns || '6'), 0)
            if (lastGroup && lastGroupCols && lastGroupCols < 6) {
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
          return (
            <div key={gi}>
              {gi > 0 && <div className="h-16 tablet:h-28 desktop:h-[200px]" />}
              {isGrid ? (
                <Container>
                  <div className="grid grid-cols-1 tablet:grid-cols-6 gap-10">
                    {group.blocks.map((block: any, bi: number) => {
                      const cols = block.columns || '6'
                      const spanMap: Record<string, string> = { '1': 'tablet:col-span-1', '2': 'tablet:col-span-2', '3': 'tablet:col-span-3', '4': 'tablet:col-span-4', '5': 'tablet:col-span-5', '6': 'tablet:col-span-6' }
                      const spanClass = spanMap[cols] || 'tablet:col-span-6'
                      return (
                        <div key={block.id || `${gi}-${bi}`} className={spanClass}>
                          {renderSection(block, gi * 100 + bi)}
                        </div>
                      )
                    })}
                  </div>
                </Container>
              ) : (
                renderSection(group.blocks[0], gi)
              )}
            </div>
          )
        })
      })()}

      <div className="h-16 tablet:h-28 desktop:h-[200px]" />
    </>
  )
}

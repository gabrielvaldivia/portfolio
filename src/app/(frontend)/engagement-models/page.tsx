import type { Metadata } from 'next'

import { ContactForm } from '@/components/ContactForm'
import { EngagementDetailHeader } from '@/components/EngagementDetailHeader'
import { HScrollContainer } from '@/components/HScrollContainer'
import { ProjectCard } from '@/components/ProjectCard'
import { cn } from '@/lib/cn'
import { getProjects } from '@/lib/queries'
import type { ResponsiveImageMedia } from '@/lib/responsiveImage'

const engagements = [
  {
    number: '01',
    slug: 'design-partner',
    name: 'Design Partner',
    price: '$10,000',
    cadence: '/ week',
    availability: '1 available',
    description:
      'I become a thought partner to the founders, bringing years of 0–1 product experience into shaping the product, its brand, and its user experience. Best for early-stage teams facing consequential decisions who want a close, ongoing creative partnership.',
    terms: 'Billed every two weeks. Cash/equity negotiable.',
    steps: [
      'I embed with your team and we collaborate to define goals and deliverables each week. No scope is too large.',
      'Available for Zoom or in-person check-ins on Tuesdays and Thursdays. Heads-down design time the rest of the week.',
      'Once we reach product market fit (typically after a 9-12 months) I help hire and onboard your in-house design team.',
    ],
    examples: [
      { slug: 'dex', name: 'Dex' },
      { slug: 'workmate', name: 'Workmate' },
      { slug: 'twinsi', name: 'Twinsi' },
    ],
  },
  {
    number: '02',
    slug: 'designer-in-residence',
    name: 'Designer in Residence',
    price: '$4,000',
    cadence: '/ week',
    availability: '2 available',
    description:
      'A designer from my team takes ownership of a well-defined problem and carries it through execution. Every designer has been trained by me in the intricacies of 0–1 work and consistently meets my quality bar. There’s less back-and-forth in this model and more focused, independent delivery.',
    terms: 'Billed every two weeks. Three-month minimum.',
    steps: [
      'A Designer in Residence embeds with your team by joining your Slack and attending weekly meetings.',
      'I act as a design manager—providing direction, feedback, and coaching throughout the week.',
      'The Designer in Residence and I host weekly reviews to share progress and align on the next priorities.',
    ],
    examples: [
      { slug: 'sensible', name: 'Sensible' },
      { slug: 'supper', name: 'Supper' },
      { slug: 'ora', name: 'ORA' },
    ],
  },
] as const

type EngagementExample = {
  featuredImage?: ResponsiveImageMedia
  slug: string
  subtitle?: string
  title: string
}

function EngagementExamples({ examples }: { examples: EngagementExample[] }) {
  if (!examples.length) return null

  return (
    <section aria-label="Example projects">
      <div className="tablet:grid tablet:grid-cols-12 tablet:gap-14 desktop:block">
        <h3 className="text-body font-semibold text-text-muted tablet:col-span-10 tablet:col-start-3">
          Examples
        </h3>
      </div>
      <HScrollContainer className="-mx-5 mt-5 tablet:-mx-10 desktop:hidden" maskOnMobile={false}>
        <div className="pl-5 tablet:grid tablet:min-w-full tablet:grid-cols-12 tablet:gap-14 tablet:px-10">
          <div className="flex w-max items-stretch gap-4 pr-5 tablet:col-span-10 tablet:col-start-3 tablet:gap-5 tablet:pr-10">
            {examples.map((example) => (
              <div key={example.slug} className="w-[280px] shrink-0 tablet:w-[320px]">
                <ProjectCard {...example} emphasizeHover />
              </div>
            ))}
          </div>
        </div>
      </HScrollContainer>
      <div className="mt-5 hidden gap-4 desktop:grid desktop:grid-cols-3">
        {examples.map((example) => (
          <ProjectCard key={example.slug} {...example} emphasizeHover />
        ))}
      </div>
    </section>
  )
}

export const metadata: Metadata = {
  title: 'Engagement Models | Gabriel Valdivia',
  description:
    'Two ways to work with Gabriel Valdivia on product design, from early product direction to ongoing design leadership.',
  alternates: { canonical: '/engagement-models' },
}

export const revalidate = 60

export default async function EngagementModelsPage() {
  const exampleSlugs = new Set<string>(
    engagements.flatMap((engagement) => engagement.examples.map((example) => example.slug)),
  )
  const { docs: projects } = await getProjects({ includeHidden: true })
  const projectsBySlug = new Map(
    projects
      .filter((project) => exampleSlugs.has(project.slug))
      .map((project) => [project.slug, project]),
  )

  return (
    <div className="engagement-models-page bg-background text-text-strong">
      <section
        id="engagements"
        className="scroll-mt-6 px-5 py-20 tablet:px-10 tablet:py-28"
      >
        <div className="mx-auto max-w-[1600px]">
          <div className="grid gap-y-6 tablet:grid-cols-12 tablet:gap-x-14 tablet:gap-y-8 desktop:gap-x-6">
            <h1 className="text-balance tablet:col-span-10 tablet:col-start-3">
              Ways of Working
            </h1>
            <p className="max-w-xl text-pretty text-body-large tablet:col-span-8 tablet:col-start-3 desktop:col-span-5 desktop:col-start-3">
              Two engagement models, each shaped for a different kind of 0–1 challenge. The details
              below outline how each engagement is structured.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Engagement details" className="[overflow-anchor:none]">
        {engagements.map((engagement) => (
          <article
            id={engagement.slug}
            key={engagement.slug}
            className="scroll-mt-6 border-t border-border-strong"
          >
            <EngagementDetailHeader
              name={engagement.name}
              number={engagement.number}
            />

            <div className="px-5 pb-20 pt-8 tablet:px-10 tablet:pb-28 tablet:pt-12">
              <div className="mx-auto grid max-w-[1600px] gap-14 tablet:grid-cols-12 desktop:gap-x-6 desktop:gap-y-16">
                <p className="text-pretty text-body-large tablet:col-span-8 tablet:col-start-3 desktop:col-span-4 desktop:col-start-3">
                  {engagement.description}
                </p>

                <div className="order-2 tablet:col-span-8 tablet:col-start-3 desktop:order-none desktop:col-span-5 desktop:col-start-8">
                  <h3 className="text-body font-semibold text-text-muted">How it works</h3>
                  <ol className="mt-5">
                    {engagement.steps.map((step, index) => (
                      <li
                        key={step}
                        className="grid grid-cols-[2rem_1fr] gap-4 text-body"
                      >
                        <span className="py-5 tabular-nums text-text-muted">{index + 1}</span>
                        <span
                          className={cn(
                            'py-5 text-pretty',
                            index > 0 && 'border-t border-border-strong',
                          )}
                        >
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="order-3 min-w-0 tablet:col-span-12 tablet:col-start-1 desktop:col-span-10 desktop:col-start-3">
                  <EngagementExamples
                    examples={engagement.examples.flatMap((example) => {
                      const project = projectsBySlug.get(example.slug)
                      if (!project) return []

                      return [{
                        featuredImage: typeof project.featuredImage === 'object'
                          ? project.featuredImage as ResponsiveImageMedia
                          : undefined,
                        slug: example.slug,
                        subtitle: project.subtitle || undefined,
                        title: project.title || example.name,
                      }]
                    })}
                  />
                </div>

                <div className="order-4 flex flex-col gap-5 tablet:col-span-8 tablet:col-start-3 desktop:col-span-10 desktop:col-start-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <p className="flex items-baseline gap-1 tabular-nums">
                      <span className="text-h4 desktop:text-h3">{engagement.price}</span>
                      <span className="text-body-large text-text-muted">{engagement.cadence}</span>
                    </p>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border-strong px-4 py-2 text-[13px] text-text-strong tablet:text-[14px]">
                      <span aria-hidden="true" className="size-2 rounded-full bg-green-500" />
                      <span className="tabular-nums">{engagement.availability}</span>
                    </span>
                  </div>
                  <p className="max-w-md text-pretty text-body text-text-muted">
                    {engagement.terms}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section
        id="contact"
        className="scroll-mt-10 border-t border-border-strong px-5 py-20 tablet:px-10 tablet:py-28"
      >
        <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-10 tablet:gap-12 desktop:gap-16">
          <h2 className="contact-prompt max-w-4xl text-center font-normal text-balance">
            Building something new? Let&apos;s talk.
          </h2>
          <div className="w-full max-w-[720px] rounded-[20px] bg-background-alt p-6 tablet:rounded-[30px] tablet:p-8 desktop:rounded-[40px] desktop:p-10">
            <ContactForm email="gabe@valdivia.works" />
          </div>
        </div>
      </section>
    </div>
  )
}

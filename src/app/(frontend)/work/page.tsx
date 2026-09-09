import { ProjectCard } from '@/components/ProjectCard'
import { FitText } from '@/components/FitText'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPageBySlug, getProjects } from '@/lib/queries'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { absoluteSiteUrl, buildSiteStructuredData, websiteReference } from '@/lib/structuredData'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('work')

  return buildPageMetadata(page, {
    fallbackTitle: 'Work',
    fallbackDescription: 'Selected projects and case studies',
    canonicalPath: '/work',
    markdownPath: '/work/index.md',
  })
}

export const revalidate = 60

export default async function WorkPage() {
  const { docs: projects } = await getProjects()
  const structuredData = buildSiteStructuredData([{
    '@type': 'CollectionPage',
    '@id': absoluteSiteUrl('/work#collection-page'),
    url: absoluteSiteUrl('/work'),
    name: 'Selected work by Gabriel Valdivia',
    description: 'Selected projects and case studies',
    inLanguage: 'en-US',
    isPartOf: websiteReference(),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: projects.flatMap((project: any, index: number) => project.slug ? [{
        '@type': 'ListItem',
        position: index + 1,
        name: project.title,
        url: absoluteSiteUrl(`/work/${encodeURIComponent(project.slug)}`),
      }] : []),
    },
  }])

  return (
    <>
      <JsonLd data={structuredData} />

      <section className="pb-20 px-5 tablet:px-10">
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">Work</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>Work</FitText>
            </div>
          </div>
          <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
            {projects.map((project: any) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                slug={project.slug}
                subtitle={project.subtitle}
                featuredImage={project.featuredImage}
                emphasizeHover
              />
            ))}
          </div>
      </section>
    </>
  )
}

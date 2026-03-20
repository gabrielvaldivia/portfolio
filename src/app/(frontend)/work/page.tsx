import { Container } from '@/components/Container'
import { ProjectCard } from '@/components/ProjectCard'
import { FitText } from '@/components/FitText'
import { getProjects } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Work — Gabriel Valdivia',
  description: 'Selected projects and case studies',
}

export const dynamic = 'force-dynamic'

export default async function WorkPage() {
  const { docs: projects } = await getProjects()

  return (
    <>
      <section className="px-5 tablet:px-10 pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <section className="pb-20">
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">Index</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>Index</FitText>
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
              />
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

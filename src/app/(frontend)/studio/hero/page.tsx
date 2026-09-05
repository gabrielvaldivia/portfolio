import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HeroEditor } from '@/components/HeroEditor'
import { heroConfig } from '@/lib/heroConfig'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Local Hero Editor',
  robots: { index: false, follow: false },
}

const PUBLIC_CMS_API = 'https://www.gabrielvaldivia.com/api'

export default async function HeroEditorPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const response = await fetch(`${PUBLIC_CMS_API}/projects?depth=1&limit=100&sort=order`, {
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Could not load projects (${response.status}).`)

  const result = await response.json()
  const projects = (result.docs || [])
    .filter((project: any) => project.hide !== true && project.slug && project.title)
    .map((project: any) => ({
      slug: project.slug,
      title: project.title,
      subtitle: project.subtitle,
      image: typeof project.featuredImage === 'object' ? project.featuredImage?.url : null,
    }))

  return (
    <main className="px-5 pb-32 pt-12 tablet:px-10 tablet:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Local workspace</p>
            <h1 className="mt-2 text-balance text-4xl font-medium tablet:text-5xl">Hero editor</h1>
            <p className="mt-4 max-w-2xl text-pretty text-muted">Edit the projects, order, copy, images, and mobile gradients shown in the homepage slideshow. Saving writes versioned files to this repository so the changes ship with the next production push.</p>
          </div>
          <Link href="/" className="rounded-full border border-border-strong px-5 py-2.5 text-sm transition-opacity duration-150 hover:opacity-60">
            View homepage
          </Link>
        </div>
        <HeroEditor projects={projects} initialSlides={heroConfig.slides} />
      </div>
    </main>
  )
}

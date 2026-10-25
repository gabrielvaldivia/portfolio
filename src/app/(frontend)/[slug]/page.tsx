import { Container } from '@/components/Container'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { withSiteSocialDefaults } from '@/lib/pageMetadataDefaults'
import { getPublishedPageBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 3600

// Render each path on first visit, then cache it for the revalidate window.
// Without this, Next renders the route on every request.
export async function generateStaticParams() {
  return []
}

// Reserved slugs handled by other routes; the home page lives at /
const RESERVED = ['home', 'work', 'about', 'clients', 'playground', 'notes', 'pricing', 'engagement-models', 'working-together', 'design-system', 'admin']

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (RESERVED.includes(slug)) return {}
  const page = await getPublishedPageBySlug(slug)
  if (!page) return {}
  return withSiteSocialDefaults(buildPageMetadata(page, {
    fallbackTitle: page.title,
    canonicalPath: `/${encodeURIComponent(slug)}`,
  }))
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (RESERVED.includes(slug)) notFound()

  const page = await getPublishedPageBySlug(slug)
  if (!page) notFound()

  return (
    <>

      <Container>
        <h1 className="mb-20">{page.title}</h1>
        <RenderBlocks blocks={page.content as any[]} />
        <div className="h-20" />
      </Container>
    </>
  )
}

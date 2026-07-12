import { Container } from '@/components/Container'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { getPublishedPageBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 60

// Reserved slugs handled by other routes
const RESERVED = ['work', 'about', 'clients', 'playground', 'design-system', 'admin']

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (RESERVED.includes(slug)) return {}
  const page = await getPublishedPageBySlug(slug)
  if (!page) return {}
  return {
    title: `${page.meta?.title || page.title} — Gabriel Valdivia`,
    description: page.meta?.description || '',
  }
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

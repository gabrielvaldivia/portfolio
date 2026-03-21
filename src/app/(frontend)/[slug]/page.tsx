import { Container } from '@/components/Container'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { getPayload } from '@/lib/payload'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Reserved slugs handled by other routes
const RESERVED = ['work', 'about', 'clients', 'playground', 'design-system', 'admin']

async function getPage(slug: string) {
  const payload = await getPayload()
  const result = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
    depth: 2,
  })
  return result.docs[0] || null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (RESERVED.includes(slug)) return {}
  const page = await getPage(slug)
  if (!page) return {}
  return {
    title: `${page.meta?.title || page.title} — Gabriel Valdivia`,
    description: page.meta?.description || '',
  }
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (RESERVED.includes(slug)) notFound()

  const page = await getPage(slug)
  if (!page) notFound()

  return (
    <>
      <section className="px-5 tablet:px-10 pt-6 tablet:pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <Container>
        <h1 className="mb-20">{page.title}</h1>
        <RenderBlocks blocks={page.content as any[]} />
        <div className="h-20" />
      </Container>
    </>
  )
}

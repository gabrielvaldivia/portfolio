import { Container } from '@/components/Container'
import { ClientsList } from '@/components/ClientsList'
import { FitText } from '@/components/FitText'
import { getPayload } from '@/lib/payload'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { getPageBySlug } from '@/lib/queries'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('clients')

  return buildPageMetadata(page, {
    fallbackTitle: 'Clients',
    fallbackDescription: 'Companies I have worked with',
  })
}

export const revalidate = 60

export default async function ClientsPage() {
  const payload = await getPayload()
  const [page, clientsResult] = await Promise.all([
    getPageBySlug('clients'),
    payload.find({
      collection: 'clients',
      sort: 'name',
      limit: 100,
      depth: 1,
    }),
  ])
  const heading = (page as any)?.clientsHeading || page?.title || 'Clients'
  const clients = clientsResult.docs

  const serialized = clients.map((client: any) => ({
    id: client.id,
    name: client.name,
    description: client.description || null,
    website: client.website || null,
    tags: Array.isArray(client.tags) ? client.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : [],
    linkType: client.linkType || null,
    page: client.page && typeof client.page === 'object'
      ? {
          relationTo: client.page.relationTo || null,
          value: client.page.value && typeof client.page.value === 'object'
            ? { slug: client.page.value.slug || null }
            : null,
        }
      : null,
  }))

  return (
    <>

      <section className="pb-20">
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">{heading}</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>{heading}</FitText>
            </div>
          </div>
          <ClientsList clients={serialized} />
        </Container>
      </section>
    </>
  )
}

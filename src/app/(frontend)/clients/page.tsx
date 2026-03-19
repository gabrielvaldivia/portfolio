import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { getPayload } from '@/lib/payload'
import { getPageBySlug } from '@/lib/queries'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Clients — Gabriel Valdivia',
  description: 'Companies I have worked with',
}

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const payload = await getPayload()
  const page = await getPageBySlug('clients')
  const heading = (page as any)?.clientsHeading || page?.title || 'Clients'
  const { docs: clients } = await payload.find({
    collection: 'clients',
    sort: 'name',
    limit: 100,
    depth: 1,
  })

  // Get all projects with client relationship
  const { docs: projects } = await payload.find({
    collection: 'projects',
    limit: 100,
    depth: 0,
  })

  // Group projects by client ID
  const projectsByClient: Record<number, typeof projects> = {}
  for (const project of projects) {
    const clientId = project.client as number
    if (clientId) {
      if (!projectsByClient[clientId]) projectsByClient[clientId] = []
      projectsByClient[clientId].push(project)
    }
  }

  // Group clients by first letter
  const grouped: Record<string, typeof clients> = {}
  clients.forEach((client: any) => {
    const letter = client.name.charAt(0).toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(client)
  })

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
            <h1 className="text-[34px] tablet:hidden">{heading}</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>{heading}</FitText>
            </div>
          </div>
          <div className="space-y-0">
            {Object.entries(grouped).sort().map(([letter, letterClients]) => (
              <div key={letter} className="flex gap-4">
                <div className="w-[40px] tablet:w-[100px] shrink-0">
                  <h4 className="text-muted sticky top-5 py-4">{letter}</h4>
                </div>
                <div className="flex-1">
                  {(letterClients as any[]).map((client: any) => {
                    const clientPage = client.page?.value as any
                    const pageCollection = client.page?.relationTo as string
                    const isInternal = client.linkType === 'internal'
                    const href = isInternal && clientPage
                      ? (pageCollection === 'projects' ? `/work/${clientPage.slug}` : `/${clientPage.slug}`)
                      : client.website
                        ? (client.website.startsWith('http') ? client.website : `https://${client.website}`)
                        : null
                    const linkContent = (
                      <>
                        <h4 className="shrink-0">{client.name}</h4>
                        {client.description && (
                          <p className="text-muted hidden tablet:inline-flex tablet:items-baseline tablet:gap-2">{client.description}<svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity translate-y-[7px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg></p>
                        )}
                        {!client.description && (
                          <svg className="shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity hidden tablet:block translate-y-[3px]" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 17L17 7M17 7H9M17 7V15" /></svg>
                        )}
                      </>
                    )
                    return (
                      <div key={client.id} className="py-4 flex items-baseline gap-4 group">
                        {href && isInternal ? (
                          <Link href={href} className="flex items-baseline gap-2 hover:opacity-60 transition-colors">{linkContent}</Link>
                        ) : href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-baseline gap-2 hover:opacity-60 transition-colors">{linkContent}</a>
                        ) : (
                          <>
                            <h4 className="shrink-0">{client.name}</h4>
                            {client.description && (
                              <p className="text-muted hidden tablet:block">{client.description}</p>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

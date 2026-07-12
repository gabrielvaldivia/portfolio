import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { PeopleGrid } from '@/components/PeopleGrid'
import { getPayload } from '@/lib/payload'
import { getPageBySlug } from '@/lib/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'People — Gabriel Valdivia',
  description: 'People I have worked with',
}

export const revalidate = 300

export default async function PeoplePage() {
  const payload = await getPayload()
  const [page, peopleResult] = await Promise.all([
    getPageBySlug('people'),
    payload.find({
      collection: 'people',
      sort: 'name',
      limit: 200,
      depth: 1,
      select: { name: true, role: true, linkedIn: true, photo: true, company: true },
    }),
  ])
  const heading = (page as any)?.peopleHeading || page?.title || 'People'
  const description = (page as any)?.peopleDescription || ''
  const people = peopleResult.docs

  const serialized = people.map((p: any) => ({
    id: p.id,
    name: p.name,
    role: p.role || null,
    linkedIn: p.linkedIn || null,
    photo: p.photo?.url ? { url: p.photo.url } : null,
    company: typeof p.company === 'object' && p.company ? { name: p.company.name } : null,
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
          {description && <p className="text-muted text-body-large max-w-[600px] pb-8">{description}</p>}
          <PeopleGrid people={serialized} />
        </Container>
      </section>
    </>
  )
}

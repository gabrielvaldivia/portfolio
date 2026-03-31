import { Container } from '@/components/Container'
import { FitText } from '@/components/FitText'
import { PeopleGrid } from '@/components/PeopleGrid'
import { getPayload } from '@/lib/payload'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'People — Gabriel Valdivia',
  description: 'People I have worked with',
}

export const revalidate = 300

export default async function PeoplePage() {
  const payload = await getPayload()
  const { docs: people } = await payload.find({
    collection: 'people',
    sort: 'name',
    limit: 200,
    depth: 2,
  })

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
      <section className="px-5 tablet:px-10 pt-6 tablet:pt-10 pb-10">
        <h3 className="text-content opacity-50">
          <Link href="/">Gabriel Valdivia</Link>
        </h3>
      </section>

      <section className="pb-20">
        <Container>
          <div className="pb-20">
            <h1 className="text-[34px] tablet:hidden">People</h1>
            <div className="hidden tablet:block">
              <FitText className="font-heading" maxSize={120}>People</FitText>
            </div>
          </div>
          <PeopleGrid people={serialized} />
        </Container>
      </section>
    </>
  )
}

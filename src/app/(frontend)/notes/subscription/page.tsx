import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/Container'
import { NotesSubscribeForm } from '@/components/NotesSubscribeForm'

export const metadata: Metadata = {
  title: 'Notes subscription — Gabriel Valdivia',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const messages = {
  confirmed: {
    title: 'You’re subscribed',
    description: 'You’ll receive an email whenever Gabe publishes a new note.',
  },
  invalid: {
    title: 'Request a new confirmation link',
    description: 'The link is invalid or has expired. Sign up again below to get a new one.',
  },
  error: {
    title: 'We couldn’t confirm your subscription',
    description: 'Something went wrong. Open the confirmation link in your email again to retry.',
  },
}

export default async function NotesSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>
}) {
  const { status } = await searchParams
  const result = status === 'confirmed' || status === 'error' ? status : 'invalid'
  const message = messages[result]

  return (
    <section className="pb-20">
      <Container>
        <div className="mx-auto grid min-h-[50vh] max-w-[760px] content-start gap-6 py-12 tablet:py-20">
          <h1 className="text-balance">{message.title}</h1>
          <p className="text-pretty text-body text-text-body">{message.description}</p>
          <Link
            href="/notes"
            className="inline-flex min-h-11 w-fit items-center rounded-full bg-content px-5 py-2.5 text-caption font-medium text-background hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
          >
            Read the notes
          </Link>
          {result === 'invalid' ? <NotesSubscribeForm /> : null}
        </div>
      </Container>
    </section>
  )
}

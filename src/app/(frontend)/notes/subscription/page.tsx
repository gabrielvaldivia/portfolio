import type { Metadata } from 'next'
import Link from '@/components/SiteLink'
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
  unsubscribe: {
    title: 'Unsubscribe from notes?',
    description: 'You’ll stop receiving an email when Gabe publishes a new note.',
  },
  unsubscribed: {
    title: 'You’re unsubscribed',
    description: 'You won’t receive any more note emails. You can subscribe again any time.',
  },
  'invalid-unsubscribe': {
    title: 'This unsubscribe link has expired',
    description: 'Use the unsubscribe link in a more recent email, or reply to any note email and Gabe will remove you.',
  },
  'unsubscribe-error': {
    title: 'We couldn’t unsubscribe you',
    description: 'Something went wrong. Open the unsubscribe link in your email again to retry.',
  },
}

type SubscriptionStatus = keyof typeof messages

export default async function NotesSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; token?: string | string[] }>
}) {
  const { status, token } = await searchParams
  const result: SubscriptionStatus = typeof status === 'string' && status in messages ? status as SubscriptionStatus : 'invalid'
  const message = messages[result]
  const unsubscribeToken = result === 'unsubscribe' && typeof token === 'string' ? token : ''

  return (
    <section className="pb-20">
      <Container>
        <div className="mx-auto grid min-h-[50vh] max-w-[760px] content-start gap-6 py-12 tablet:py-20">
          <h1 className="text-balance">{message.title}</h1>
          <p className="text-pretty text-body text-text-body">{message.description}</p>
          {unsubscribeToken ? (
            <form method="post" action={`/api/notes/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`}>
              <input type="hidden" name="confirm" value="1" />
              <button
                type="submit"
                className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-full border border-border-strong px-5 py-2.5 text-caption font-medium hover:bg-background-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
              >
                Unsubscribe
              </button>
            </form>
          ) : null}
          <Link
            href="/notes"
            className="inline-flex min-h-11 w-fit items-center rounded-full bg-content px-5 py-2.5 text-caption font-medium text-background hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
          >
            Read the notes
          </Link>
          {result === 'invalid' || result === 'unsubscribed' ? <NotesSubscribeForm /> : null}
        </div>
      </Container>
    </section>
  )
}

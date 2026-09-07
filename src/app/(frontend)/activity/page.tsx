import type { Metadata } from 'next'
import { ActivityLazyContent } from '@/components/ActivityLazyContent'
import { Container } from '@/components/Container'
import {
  getModuleLikeActivityPage,
  type ModuleLikeActivityPage,
} from '@/lib/moduleLikeActivity'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity - Gabriel Valdivia',
  description: 'Recent chats, highlights, and likes across Gabriel Valdivia’s notes, projects, and media.',
}

function getEmptyActivityPage(): ModuleLikeActivityPage {
  return { items: [], nextCursor: null }
}

export default async function ActivityPage() {
  let activityPage = getEmptyActivityPage()
  let unavailable = false

  try {
    activityPage = await getModuleLikeActivityPage()
  } catch (error) {
    console.error('Activity data unavailable.', error)
    unavailable = true
  }

  return (
    <section className="pb-20">
      <Container>
        <h1 className="pb-12 text-[34px] text-text-strong tablet:text-h2">Activity</h1>
        <ActivityLazyContent
          initialActivityPage={activityPage}
          initialNow={new Date().toISOString()}
          unavailable={unavailable}
        />
      </Container>
    </section>
  )
}

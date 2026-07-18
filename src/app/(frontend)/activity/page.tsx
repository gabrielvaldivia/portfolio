import type { Metadata } from 'next'
import { ActivityLazyContent } from '@/components/ActivityLazyContent'
import { ActivityViewSwitcher, type ActivityView } from '@/components/ActivityViewSwitcher'
import { Container } from '@/components/Container'
import {
  getModuleLikeActivityPage,
  getModuleLikeFeedPage,
  type ModuleLikeActivityPage,
  type ModuleLikeFeedPage,
} from '@/lib/moduleLikeActivity'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Activity - Gabriel Valdivia',
  description: 'Recent and most-liked modules on Gabriel Valdivia portfolio projects and media.',
}

type ActivityPageSearchParams = {
  view?: string | string[]
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getActivityView(searchParams: ActivityPageSearchParams): ActivityView {
  return getSearchParamValue(searchParams.view) === 'feed' ? 'feed' : 'activity'
}

function getEmptyActivityPage(): ModuleLikeActivityPage {
  return { items: [], nextCursor: null }
}

function getEmptyFeedPage(): ModuleLikeFeedPage {
  return { items: [], nextCursor: null }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<ActivityPageSearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const view = getActivityView(resolvedSearchParams)
  let activityPage = getEmptyActivityPage()
  let feedPage = getEmptyFeedPage()
  let unavailable = false

  try {
    if (view === 'feed') {
      feedPage = await getModuleLikeFeedPage()
    } else {
      activityPage = await getModuleLikeActivityPage()
    }
  } catch (error) {
    console.error('Activity data unavailable.', error)
    unavailable = true
  }

  return (
    <section className="pb-20">
      <Container>
        <ActivityViewSwitcher view={view}>
          <ActivityLazyContent
            key={view}
            view={view}
            initialActivityPage={activityPage}
            initialFeedPage={feedPage}
            initialNow={new Date().toISOString()}
            unavailable={unavailable}
          />
        </ActivityViewSwitcher>
      </Container>
    </section>
  )
}

'use client'

import type { MouseEvent, ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export type ActivityView = 'activity' | 'feed'

function getViewFromLocation(): ActivityView {
  if (typeof window === 'undefined') return 'activity'

  return new URLSearchParams(window.location.search).get('view') === 'feed' ? 'feed' : 'activity'
}

function getViewHref(view: ActivityView) {
  return view === 'feed' ? '/activity?view=feed' : '/activity'
}

export function ActivityViewSwitcher({
  initialView,
  activity,
  feed,
}: {
  initialView: ActivityView
  activity: ReactNode
  feed: ReactNode
}) {
  const [view, setView] = useState<ActivityView>(initialView)
  const linkClassName = 'transition-opacity duration-150 hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content'

  useEffect(() => {
    setView(getViewFromLocation())

    function handlePopState() {
      setView(getViewFromLocation())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const selectView = useCallback((nextView: ActivityView, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (nextView === view) return

    window.history.pushState(null, '', getViewHref(nextView))
    setView(nextView)
  }, [view])

  return (
    <>
      <div className="pb-6 tablet:pb-8">
        <nav aria-label="Activity views">
          <h1 className="sr-only">Activity</h1>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-heading text-[22px] leading-[1.3] tablet:gap-x-8 tablet:text-[26px] desktop:text-[30px]">
            <a
              href="/activity"
              aria-current={view === 'activity' ? 'page' : undefined}
              className={cn(linkClassName, view === 'activity' ? 'opacity-100' : 'opacity-40')}
              onClick={(event) => selectView('activity', event)}
            >
              Activity
            </a>
            <a
              href="/activity?view=feed"
              aria-current={view === 'feed' ? 'page' : undefined}
              className={cn(linkClassName, view === 'feed' ? 'opacity-100' : 'opacity-40')}
              onClick={(event) => selectView('feed', event)}
            >
              Feed
            </a>
          </div>
        </nav>
      </div>

      <div hidden={view !== 'activity'}>
        {activity}
      </div>
      <div hidden={view !== 'feed'}>
        {feed}
      </div>
    </>
  )
}

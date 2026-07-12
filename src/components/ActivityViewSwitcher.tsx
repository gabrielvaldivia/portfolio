import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

export type ActivityView = 'activity' | 'feed'

export function ActivityViewSwitcher({
  view,
  children,
}: {
  view: ActivityView
  children: ReactNode
}) {
  const linkClassName = 'transition-opacity duration-150 hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-content'

  return (
    <>
      <div className="pb-6 tablet:pb-8">
        <nav aria-label="Activity views">
          <h1 className="sr-only">Activity</h1>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-heading text-[22px] leading-[1.3] tablet:gap-x-8 tablet:text-[26px] desktop:text-[30px]">
            <Link
              href="/activity"
              prefetch
              aria-current={view === 'activity' ? 'page' : undefined}
              className={cn(linkClassName, view === 'activity' ? 'opacity-100' : 'opacity-40')}
            >
              Activity
            </Link>
            <Link
              href="/activity?view=feed"
              prefetch
              aria-current={view === 'feed' ? 'page' : undefined}
              className={cn(linkClassName, view === 'feed' ? 'opacity-100' : 'opacity-40')}
            >
              Feed
            </Link>
          </div>
        </nav>
      </div>

      {children}
    </>
  )
}

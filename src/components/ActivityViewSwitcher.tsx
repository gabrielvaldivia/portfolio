import type { ReactNode } from 'react'
import { SegmentedControl } from '@/components/SegmentedControl'

export type ActivityView = 'activity' | 'feed'

export function ActivityViewSwitcher({
  view,
  children,
}: {
  view: ActivityView
  children: ReactNode
}) {
  return (
    <>
      <div className="flex justify-center pb-6 tablet:pb-8">
        <h1 className="sr-only">Activity</h1>
        <SegmentedControl
          ariaLabel="Activity views"
          items={[
            { href: '/activity', label: 'Activity', selected: view === 'activity' },
            { href: '/activity?view=feed', label: 'Feed', selected: view === 'feed' },
          ]}
        />
      </div>

      {children}
    </>
  )
}

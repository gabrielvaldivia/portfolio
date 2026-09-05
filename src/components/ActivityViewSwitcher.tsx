import type { ReactNode } from 'react'

export type ActivityView = 'activity' | 'feed'

export function ActivityViewSwitcher({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <h1 className="sr-only">Activity</h1>
      {children}
    </>
  )
}

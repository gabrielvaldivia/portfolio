'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { SegmentedControl } from '@/components/SegmentedControl'
import { cn } from '@/lib/cn'

function SiteHeaderFrame({
  activityView,
}: {
  activityView?: 'activity' | 'feed'
}) {
  return (
    <header className="relative h-[94px] px-4 tablet:h-[114px] tablet:px-10">
      <h3 className={cn('text-content opacity-50 tablet:pt-10', activityView ? 'pt-5' : 'pt-6')}>
        <Link
          href="/"
          className={activityView ? 'text-[13px] tablet:text-[26px] desktop:text-[30px]' : undefined}
        >
          Gabriel Valdivia
        </Link>
      </h3>

      {activityView ? (
        <SegmentedControl
          ariaLabel="Activity views"
          className="absolute left-1/2 top-4 z-50 -translate-x-1/2 tablet:top-10"
          items={[
            { href: '/activity', label: 'Activity', selected: activityView === 'activity' },
            { href: '/activity?view=feed', label: 'Feed', selected: activityView === 'feed' },
          ]}
        />
      ) : null}
    </header>
  )
}

export function SiteHeaderFallback() {
  return <SiteHeaderFrame />
}

export function SiteHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  if (pathname.startsWith('/chat')) return null

  const activityView = pathname === '/activity'
    ? searchParams.get('view') === 'feed' ? 'feed' : 'activity'
    : undefined

  return <SiteHeaderFrame activityView={activityView} />
}

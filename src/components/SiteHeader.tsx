'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SegmentedControl } from '@/components/SegmentedControl'
import { cn } from '@/lib/cn'

function SiteHeaderFrame({
  activityView,
  onBack,
}: {
  activityView?: 'activity' | 'feed'
  onBack?: () => void
}) {
  return (
    <header className="relative h-[94px] px-4 tablet:h-[114px] tablet:px-10">
      <h3
        className={cn(
          'text-content',
          activityView
            ? 'hidden tablet:block tablet:pt-10'
            : 'pt-6 tablet:pt-10',
        )}
      >
        <Link
          href="/"
          className="inline-block opacity-50 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
        >
          Gabriel Valdivia
        </Link>
      </h3>

      {activityView ? (
        <>
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="absolute left-4 top-4 z-50 flex h-10 items-center gap-1 text-[13px] text-content opacity-50 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content tablet:hidden"
          >
            <svg
              aria-hidden="true"
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back</span>
          </button>

          <SegmentedControl
            ariaLabel="Activity views"
            className="absolute left-1/2 top-4 z-50 -translate-x-1/2 tablet:top-10"
            items={[
              { href: '/activity', label: 'Activity', selected: activityView === 'activity' },
              { href: '/activity?view=feed', label: 'Feed', selected: activityView === 'feed' },
            ]}
          />
        </>
      ) : null}
    </header>
  )
}

export function SiteHeaderFallback() {
  return <SiteHeaderFrame />
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  if (pathname.startsWith('/chat')) return null

  const activityView = pathname === '/activity'
    ? searchParams.get('view') === 'feed' ? 'feed' : 'activity'
    : undefined

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push('/')
  }

  return (
    <SiteHeaderFrame
      activityView={activityView}
      onBack={handleBack}
    />
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'

function SiteHeaderFrame({
  isActivity = false,
  onBack,
}: {
  isActivity?: boolean
  onBack?: () => void
}) {
  return (
    <header className="relative h-[94px] px-4 tablet:h-[114px] tablet:px-10">
      <h3
        className={cn(
          'text-text-strong',
          isActivity
            ? 'hidden tablet:block tablet:pt-10'
            : 'pt-6 tablet:pt-10',
        )}
      >
        <Link
          href="/"
          className="inline-block text-text-muted transition-colors duration-150 hover:text-text-strong focus-visible:text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
        >
          Gabriel Valdivia
        </Link>
      </h3>

      {isActivity ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="absolute left-4 top-4 z-50 flex h-10 items-center gap-1 text-[13px] text-text-muted transition-colors duration-150 hover:text-text-strong focus-visible:text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content tablet:hidden"
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
  if (pathname.startsWith('/chat')) return null

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push('/')
  }

  return (
    <SiteHeaderFrame
      isActivity={pathname === '/activity'}
      onBack={handleBack}
    />
  )
}

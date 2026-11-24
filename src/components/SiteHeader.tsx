'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function SiteHeaderFrame({ pinned = false }: { pinned?: boolean }) {
  return (
    <header className="relative h-[94px] px-5 tablet:h-[114px] tablet:px-10">
      {/* On very wide case studies the name stays put above the fixed sidebar. */}
      <h3 className={`text-text-strong pt-6 tablet:pt-10 ${pinned ? 'wide:fixed wide:left-10 wide:top-0 wide:z-10' : ''}`}>
        <Link
          href="/"
          className="inline-block text-text-muted transition-colors duration-150 hover:text-text-strong focus-visible:text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content"
        >
          Gabriel Valdivia
        </Link>
      </h3>
    </header>
  )
}

export function SiteHeaderFallback() {
  return <SiteHeaderFrame />
}

export function SiteHeader() {
  const pathname = usePathname()
  if (pathname.startsWith('/chat')) return null

  return <SiteHeaderFrame pinned={/^\/work\/[^/]+\/?$/.test(pathname)} />
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function SiteHeaderFrame() {
  return (
    <header className="relative h-[94px] px-4 tablet:h-[114px] tablet:px-10">
      <h3 className="text-text-strong pt-6 tablet:pt-10">
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

  return <SiteHeaderFrame />
}

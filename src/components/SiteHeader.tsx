'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SiteHeader() {
  const pathname = usePathname()
  if (pathname.startsWith('/chat')) return null

  return (
    <header className="relative h-[94px] px-4 tablet:h-[114px] tablet:px-10">
      <h3 className="pt-6 text-content opacity-50 tablet:pt-10">
        <Link href="/">Gabriel Valdivia</Link>
      </h3>
    </header>
  )
}

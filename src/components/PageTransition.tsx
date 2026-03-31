'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLElement>(null)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname

    const el = ref.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetHeight
    el.style.animation = ''
  }, [pathname])

  return (
    <main ref={ref} className="page-transition">
      {children}
    </main>
  )
}

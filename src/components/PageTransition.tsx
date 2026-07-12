'use client'

import { usePathname } from 'next/navigation'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const transitionKey = pathname.startsWith('/chat') ? 'chat' : pathname

  return (
    <main key={transitionKey} className="page-transition">
      {children}
    </main>
  )
}

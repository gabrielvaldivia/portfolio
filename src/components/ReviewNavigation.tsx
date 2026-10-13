'use client'

import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { publicPathname, reviewHref } from '@/lib/reviewPaths'

const ReviewContext = createContext(false)

export function ReviewNavigation({ children }: { children: ReactNode }) {
  return <ReviewContext value={true}>{children}</ReviewContext>
}

export function useReviewHref() {
  const review = useContext(ReviewContext)
  return useCallback((href: string) => reviewHref(href, review), [review])
}

export function useSitePathname() {
  const pathname = usePathname()
  return useContext(ReviewContext) ? publicPathname(pathname) : pathname
}

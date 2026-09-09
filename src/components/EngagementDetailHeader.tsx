'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

const COMPACT_TITLE_LEAD_PX = 16

type EngagementDetailHeaderProps = {
  name: string
  number: string
}

export function EngagementDetailHeader({ name, number }: EngagementDetailHeaderProps) {
  const stickyRowRef = useRef<HTMLDivElement>(null)
  const largeTitleRef = useRef<HTMLHeadingElement>(null)
  const desktopStickyMarkerRef = useRef<HTMLDivElement>(null)
  const [showCompactTitle, setShowCompactTitle] = useState(false)
  const [isDesktopHeaderSticky, setIsDesktopHeaderSticky] = useState(false)

  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 809px)')
    let observer: IntersectionObserver | undefined

    const observeLargeTitle = () => {
      observer?.disconnect()
      observer = undefined
      setShowCompactTitle(false)

      if (!mobileViewport.matches) return

      const stickyRow = stickyRowRef.current
      const largeTitle = largeTitleRef.current
      if (!stickyRow || !largeTitle) return

      const stickyRowHeight = stickyRow.getBoundingClientRect().height
      const revealLine = stickyRowHeight + COMPACT_TITLE_LEAD_PX
      const updateCompactTitle = () => {
        setShowCompactTitle(
          largeTitle.getBoundingClientRect().bottom <= revealLine,
        )
      }

      observer = new IntersectionObserver(updateCompactTitle, {
        rootMargin: `-${revealLine}px 0px 0px 0px`,
        threshold: 0,
      })
      observer.observe(largeTitle)
      updateCompactTitle()
    }

    observeLargeTitle()
    mobileViewport.addEventListener('change', observeLargeTitle)
    window.addEventListener('resize', observeLargeTitle, { passive: true })

    return () => {
      observer?.disconnect()
      mobileViewport.removeEventListener('change', observeLargeTitle)
      window.removeEventListener('resize', observeLargeTitle)
    }
  }, [])

  useEffect(() => {
    const desktopViewport = window.matchMedia('(min-width: 810px)')
    let observer: IntersectionObserver | undefined

    const observeStickyMarker = () => {
      observer?.disconnect()
      observer = undefined
      setIsDesktopHeaderSticky(false)

      if (!desktopViewport.matches) return

      const marker = desktopStickyMarkerRef.current
      if (!marker) return

      observer = new IntersectionObserver(([entry]) => {
        setIsDesktopHeaderSticky(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        )
      })
      observer.observe(marker)
      setIsDesktopHeaderSticky(marker.getBoundingClientRect().bottom < 0)
    }

    observeStickyMarker()
    desktopViewport.addEventListener('change', observeStickyMarker)
    window.addEventListener('resize', observeStickyMarker, { passive: true })

    return () => {
      observer?.disconnect()
      desktopViewport.removeEventListener('change', observeStickyMarker)
      window.removeEventListener('resize', observeStickyMarker)
    }
  }, [])

  return (
    <>
      <div
        ref={stickyRowRef}
        className="sticky top-0 z-10 grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-4 bg-background px-5 py-5 tablet:hidden"
      >
        <p className="text-body-large tabular-nums text-text-muted">{number}</p>
        <span
          aria-hidden="true"
          className={cn(
            'truncate pr-14 text-body transition-[opacity,translate] duration-150 ease-out motion-reduce:translate-y-0 motion-reduce:transition-none',
            showCompactTitle
              ? 'translate-y-0 opacity-100'
              : 'translate-y-1 opacity-0',
          )}
        >
          {name}
        </span>
      </div>

      <h2 ref={largeTitleRef} className="text-balance px-5 pb-2 pr-20 tablet:hidden">
        {name}
      </h2>

      <div
        ref={desktopStickyMarkerRef}
        aria-hidden="true"
        className="-mb-px hidden h-px tablet:block"
      />
      <header
        className={cn(
          'sticky top-0 z-10 hidden bg-background px-10 transition-[padding] duration-200 ease-out motion-reduce:transition-none tablet:block',
          isDesktopHeaderSticky ? 'py-5' : 'py-8',
        )}
      >
        <div className="mx-auto grid max-w-[1600px] grid-cols-12 items-start gap-6">
          <p className="col-span-2 text-body-large tabular-nums text-text-muted">{number}</p>
          <h2
            className={cn(
              'col-span-10 text-balance transition-[font-size,line-height] duration-200 ease-out motion-reduce:transition-none',
              isDesktopHeaderSticky && 'text-body-large',
            )}
          >
            {name}
          </h2>
        </div>
      </header>
    </>
  )
}

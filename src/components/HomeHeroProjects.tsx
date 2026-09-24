'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore, type ComponentProps } from 'react'
import { HeroProjectStrip } from '@/components/HeroProjectStrip'
import type { HeroProjectSlideshow as Slideshow } from '@/components/HeroProjectSlideshow'

const HeroProjectSlideshow = dynamic(() => import('@/components/HeroProjectSlideshow').then(module => module.HeroProjectSlideshow))
const mobileQuery = '(max-width: 809px)'
const getMobileSnapshot = () => window.matchMedia(mobileQuery).matches
const getServerSnapshot = () => false
function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

export function HomeHeroProjects({ projects }: ComponentProps<typeof Slideshow>) {
  const isMobile = useSyncExternalStore(subscribeToViewport, getMobileSnapshot, getServerSnapshot)

  return (
    <>
      <div className="home-mobile-slideshow tablet:hidden">
        {isMobile ? <HeroProjectSlideshow projects={projects} /> : null}
      </div>
      <div className="hidden tablet:block">
        {isMobile ? null : <HeroProjectStrip projects={projects} />}
      </div>
    </>
  )
}

import type { Metadata } from 'next'

import { TitleParticleLab } from '@/components/lab/titleParticles/TitleParticleLab'
import { getProjects } from '@/lib/queries'

// Unlisted lab: kept out of navigation, the sitemap and agent indexes.
export const metadata: Metadata = {
  title: 'Work title particles — Lab',
  robots: { index: false, follow: false },
}

const FALLBACK_TITLES = ['Selected work']

export default async function WorkTitleParticlesLab() {
  let titles = FALLBACK_TITLES
  try {
    const { docs } = await getProjects()
    const found = docs.map((p) => p.title).filter(Boolean)
    if (found.length) titles = found
  } catch {
    // Fall back to placeholder text when the CMS isn't reachable.
  }
  return <TitleParticleLab titles={titles} />
}

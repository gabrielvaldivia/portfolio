'use client'

import { ParticleTitle, useReducedMotion } from '@/components/lab/titleParticles/ParticleTitle'
import { smear } from '@/components/lab/titleParticles/letterEffects'

// Smear only nudges the letters, so the canvas needs just a little room around the title.
const BLEED = { x: 32, top: 32, bottom: 32 }

/** Work page title, sized to fill the width at every breakpoint, with the Smear hover effect from the title lab. */
export function WorkTitle({ title }: { title: string }) {
  const reduced = useReducedMotion()
  return <ParticleTitle effect={smear} title={title} enabled={!reduced} bleed={BLEED} fitOnMobile />
}

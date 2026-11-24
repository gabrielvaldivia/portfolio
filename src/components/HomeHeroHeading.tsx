'use client'

import { ParticleTitle, useReducedMotion } from '@/components/lab/titleParticles/ParticleTitle'
import { smear } from '@/components/lab/titleParticles/letterEffects'

// Same Smear hover as the case study titles, with the same small canvas bleed.
const BLEED = { x: 32, top: 32, bottom: 32 }

/** Homepage headline, one line per entry in `lines` from tablet up, with the Smear hover effect. */
export function HomeHeroHeading({ lines, className }: { lines: string[]; className?: string }) {
  const reduced = useReducedMotion()
  const label = lines.join(' ')

  return (
    <ParticleTitle effect={smear} title={label} enabled={!reduced} bleed={BLEED} className={className}>
      <h1 data-particle-text aria-label={label} className="home-hero-heading text-left">
        {lines.map((line, index) => (
          <span
            key={`${line}-${index}`}
            aria-hidden="true"
            className={lines.length > 1 ? 'tablet:block tablet:whitespace-nowrap' : undefined}
          >
            {line}{index < lines.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>
    </ParticleTitle>
  )
}

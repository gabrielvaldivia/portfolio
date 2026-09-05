'use client'

import Image from 'next/image'
import { useState } from 'react'

const portraits = Array.from({ length: 40 }, (_, age) => ({
  age,
  year: 1987 + age,
  image: `/portrait-ages/age-${String(age).padStart(2, '0')}.png`,
}))

export function PortraitGrid() {
  const [selectedAges, setSelectedAges] = useState<Set<number>>(() => new Set())

  const toggleAge = (age: number) => {
    setSelectedAges((current) => {
      const next = new Set(current)

      if (next.has(age)) {
        next.delete(age)
      } else {
        next.add(age)
      }

      return next
    })
  }

  return (
    <section
      aria-label="Portraits from age 0 through age 39"
      className="grid grid-cols-2 border-l border-t border-border-strong tablet:grid-cols-4 desktop:grid-cols-5 desktopXL:grid-cols-8"
    >
      {portraits.map((portrait) => {
        const isSelected = selectedAges.has(portrait.age)

        return (
          <article className="min-w-0 border-b border-r border-border-strong" key={portrait.age}>
            <button
              aria-label={`${isSelected ? 'Remove' : 'Add'} age ${portrait.age} ${isSelected ? 'from' : 'to'} the comparison`}
              aria-pressed={isSelected}
              className={`relative block w-full cursor-pointer bg-transparent p-0 text-left focus-visible:z-20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                isSelected
                  ? 'z-10 after:pointer-events-none after:absolute after:inset-0 after:z-10 after:border-2 after:border-accent after:content-[\'\']'
                  : ''
              }`}
              onClick={() => toggleAge(portrait.age)}
              type="button"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-white">
                <Image
                  alt={`Engraved portrait of Gabriel Valdivia at age ${portrait.age}`}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1536px) 12.5vw, (min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
                  src={portrait.image}
                />
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border-strong px-3 py-3 tablet:px-4">
                <p className="text-body leading-none">Age {portrait.age}</p>
                <p className="font-mono text-[11px] leading-none text-muted">{portrait.year}</p>
              </div>
            </button>
          </article>
        )
      })}
    </section>
  )
}

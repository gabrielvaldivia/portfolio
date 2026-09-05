import type { Metadata } from 'next'

import { PortraitGrid } from '@/components/PortraitGrid'

export const metadata: Metadata = {
  title: 'Portrait Timeline — Gabriel Valdivia',
  robots: { index: false, follow: false },
}

export default function PortraitStylesPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1560px] px-5 pb-20 pt-36 tablet:px-10 tablet:pt-44 desktop:px-20">
      <header className="max-w-[760px] pb-14 tablet:pb-20">
        <p className="pb-3 text-[14px] text-muted">Timeline portraits · Ages 0–39</p>
        <h1 className="text-balance text-[48px] leading-[0.98] tablet:text-[72px] desktop:text-[84px]">
          Portraits, ages 0–39
        </h1>
        <p className="max-w-[620px] pt-6 text-pretty text-[18px] leading-[1.45] text-muted tablet:text-[20px]">
          A chronological review of the engraved portrait system. Every face uses the same frontal angle, neutral expression, isolated head crop, and black-and-white treatment.
        </p>
      </header>

      <PortraitGrid />
    </main>
  )
}

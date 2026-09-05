'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

type Props = {
  index: number
  title: string
  children: ReactNode
}

export function ApproachTimelineItem({ index, title, children }: Props) {
  const rowRef = useRef<HTMLLIElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: rowRef,
    offset: ['start 80%', 'end 40%'],
  })
  const rowOpacity = useTransform(scrollYProgress, [0, 0.28], [0.45, 1])

  return (
    <motion.li
      ref={rowRef}
      className="home-approach-row tablet:items-baseline"
      style={{ opacity: prefersReducedMotion ? 1 : rowOpacity }}
    >
      <div className="relative flex items-center gap-5 tablet:block tablet:pl-16">
        <span aria-hidden="true" className="relative z-10 order-2 ml-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-background text-[28px] leading-none text-content tabular-nums tablet:absolute tablet:left-0 tablet:top-1/2 tablet:order-none tablet:ml-0 tablet:-translate-y-1/2 desktop:top-0 desktop:h-[39px] desktop:translate-y-0 desktop:border-0 desktop:bg-transparent desktop:font-heading desktop:text-[30px] desktop:leading-[1.3] desktop:opacity-25">
          {index + 1}
        </span>
        <h4 className="home-approach-title text-balance">{title}</h4>
      </div>
      {children}
    </motion.li>
  )
}

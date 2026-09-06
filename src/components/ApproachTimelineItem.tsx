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
      <div className="relative pl-10 tablet:pl-16">
        <span aria-hidden="true" className="absolute left-0 top-0 z-10 font-heading text-[22px] leading-[1.3] text-content opacity-25 tabular-nums tablet:text-[26px] desktop:text-[30px]">
          {index + 1}
        </span>
        <h4 className="home-approach-title">{title}</h4>
      </div>
      {children}
    </motion.li>
  )
}

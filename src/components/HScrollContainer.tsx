'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

export function HScrollContainer({ children, className = '', snap = false, maskOnMobile = true, dots = false }: { children: React.ReactNode; className?: string; snap?: boolean; maskOnMobile?: boolean; dots?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [maskClass, setMaskClass] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const isMobile = window.innerWidth < 810
    if (isMobile && !maskOnMobile) {
      setMaskClass('')
    } else {
      const hasOverflow = el.scrollWidth > el.clientWidth
      if (!hasOverflow) {
        setMaskClass('')
      } else {
        const atStart = el.scrollLeft < 2
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
        if (atStart && !atEnd) setMaskClass('hscroll-mask-right')
        else if (!atStart && atEnd) setMaskClass('hscroll-mask-left')
        else if (!atStart && !atEnd) setMaskClass('hscroll-masked')
        else setMaskClass('')
      }
    }

    if (dots) {
      const snapChildren = el.querySelector(':scope > *')?.children
      if (snapChildren) {
        setTotalItems(snapChildren.length)
        const scrollCenter = el.scrollLeft + el.clientWidth / 2
        let closest = 0
        let closestDist = Infinity
        for (let i = 0; i < snapChildren.length; i++) {
          const child = snapChildren[i] as HTMLElement
          const childCenter = child.offsetLeft + child.offsetWidth / 2
          const dist = Math.abs(scrollCenter - childCenter)
          if (dist < closestDist) {
            closestDist = dist
            closest = i
          }
        }
        setActiveIndex(closest)
      }
    }
  }, [maskOnMobile, dots])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [update])

  return (
    <div className={`${className} ${maskClass}`}>
      <div ref={ref} className={`overflow-x-auto scrollbar-hide ${snap ? 'snap-x snap-mandatory' : ''}`}>
        {children}
      </div>
      {dots && totalItems > 1 && (
        <div className="flex justify-center gap-1.5 pt-4 tablet:hidden">
          {Array.from({ length: totalItems }).map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIndex ? 'bg-content' : 'bg-border-strong'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

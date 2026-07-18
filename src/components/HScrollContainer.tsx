'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

export function HScrollContainer({ children, className = '', snap = false, maskOnMobile = true, dots = false }: { children: React.ReactNode; className?: string; snap?: boolean; maskOnMobile?: boolean; dots?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const needsMeasureRef = useRef(true)
  const itemCentersRef = useRef<number[]>([])
  const [maskClass, setMaskClass] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const update = useCallback((measure = false) => {
    const el = ref.current
    if (!el) return

    if (measure && dots) {
      const snapChildren = el.querySelector(':scope > *')?.children
      const centers = snapChildren
        ? Array.from(snapChildren, (child) => {
            const item = child as HTMLElement
            return item.offsetLeft + item.offsetWidth / 2
          })
        : []
      itemCentersRef.current = centers
      setTotalItems((current) => current === centers.length ? current : centers.length)
    }

    const isMobile = window.innerWidth < 810
    let nextMaskClass = ''

    if (isMobile && !maskOnMobile) {
      nextMaskClass = ''
    } else {
      const hasOverflow = el.scrollWidth > el.clientWidth
      if (hasOverflow) {
        const atStart = el.scrollLeft < 2
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
        if (atStart && !atEnd) nextMaskClass = 'hscroll-mask-right'
        else if (!atStart && atEnd) nextMaskClass = 'hscroll-mask-left'
        else if (!atStart && !atEnd) nextMaskClass = 'hscroll-masked'
      }
    }
    setMaskClass((current) => current === nextMaskClass ? current : nextMaskClass)

    if (dots) {
      const itemCenters = itemCentersRef.current
      if (itemCenters.length) {
        const scrollCenter = el.scrollLeft + el.clientWidth / 2
        let closest = 0
        let closestDist = Infinity
        for (let i = 0; i < itemCenters.length; i++) {
          const dist = Math.abs(scrollCenter - itemCenters[i])
          if (dist < closestDist) {
            closestDist = dist
            closest = i
          }
        }
        setActiveIndex((current) => current === closest ? current : closest)
      }
    }
  }, [maskOnMobile, dots])

  const scheduleUpdate = useCallback((measure = false) => {
    needsMeasureRef.current ||= measure
    if (frameRef.current !== null) return

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const shouldMeasure = needsMeasureRef.current
      needsMeasureRef.current = false
      update(shouldMeasure)
    })
  }, [update])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const content = el.firstElementChild
    const handleScroll = () => scheduleUpdate()
    scheduleUpdate(true)
    el.addEventListener('scroll', handleScroll, { passive: true })
    const observer = new ResizeObserver(() => scheduleUpdate(true))
    observer.observe(el)
    if (content) observer.observe(content)
    return () => {
      el.removeEventListener('scroll', handleScroll)
      observer.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [scheduleUpdate])

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

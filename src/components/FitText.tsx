'use client'

import { useRef, useEffect, useState } from 'react'

export function FitText({ children, className = '', mobileSize = 34, maxSize, sidebarSize, fitOnMobile = false }: {
  children: React.ReactNode
  className?: string
  mobileSize?: number
  maxSize?: number
  /** From the wide (2000px) breakpoint, where case studies use a sidebar, hold this size, shrinking only if the text would not fit. */
  sidebarSize?: number
  /** Fill the width on small screens too, instead of using `mobileSize`. */
  fitOnMobile?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    const resize = () => {
      const isMobile = window.innerWidth < 810
      if (isMobile && !fitOnMobile) {
        text.style.fontSize = `${mobileSize}px`
        return
      }

      // Binary search for the perfect font size that fills the container
      let low = 20
      let high = 500
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2)
        text.style.fontSize = `${mid}px`
        if (text.scrollWidth > container.clientWidth) {
          high = mid
        } else {
          low = mid
        }
      }
      const cap = sidebarSize && window.innerWidth >= 2000 ? sidebarSize : maxSize
      const final = cap ? Math.min(low, cap) : low
      text.style.fontSize = `${final}px`
    }

    resize()
    setReady(true)
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [children, mobileSize, maxSize, sidebarSize, fitOnMobile])

  return (
    <div ref={containerRef} className={`overflow-visible ${className}`} style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <span
        ref={textRef}
        className={`block ${fitOnMobile ? 'whitespace-nowrap' : 'whitespace-normal tablet:whitespace-nowrap'}`}
        style={{ lineHeight: 1.15, letterSpacing: '-0.04em', fontWeight: 400 }}
      >
        {children}
      </span>
    </div>
  )
}

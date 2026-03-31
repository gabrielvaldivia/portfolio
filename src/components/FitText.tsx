'use client'

import { useRef, useEffect, useState } from 'react'

export function FitText({ children, className = '', mobileSize = 34, maxSize }: {
  children: React.ReactNode
  className?: string
  mobileSize?: number
  maxSize?: number
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
      if (isMobile) {
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
      const final = maxSize ? Math.min(low, maxSize) : low
      text.style.fontSize = `${final}px`
    }

    resize()
    setReady(true)
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [children, mobileSize, maxSize])

  return (
    <div ref={containerRef} className={`overflow-visible ${className}`} style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <span
        ref={textRef}
        className="block whitespace-normal tablet:whitespace-nowrap"
        style={{ lineHeight: 1.15, letterSpacing: '-0.04em', fontWeight: 400 }}
      >
        {children}
      </span>
    </div>
  )
}

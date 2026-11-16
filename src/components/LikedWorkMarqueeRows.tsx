'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { LikedWorkMarquee, type LikedWorkMarqueeItem } from '@/components/LikedWorkMarquee'
import { getMarqueeRowExpansion, type MarqueeRowExpansion } from '@/lib/marqueeMotion'

const EXPANDED_VIEWPORT_INSET = 16

type Expansion = {
  rowIndex: number
  position: number
  rows: MarqueeRowExpansion[]
}

function measureRow(row: Element) {
  const track = row.querySelector<HTMLElement>('.liked-work-marquee-track')
  if (!track) return { slots: [], gap: 0 }
  // offsetLeft ignores the per-card shifts, so switching cards measures the resting layout.
  const trackLeft = track.getBoundingClientRect().left
  const slots = [...track.querySelectorAll<HTMLElement>('[data-marquee-slot]')].map((slot) => ({
    position: Number(slot.dataset.position),
    left: trackLeft + slot.offsetLeft,
    width: slot.offsetWidth,
    height: slot.offsetHeight,
    top: slot.getBoundingClientRect().top,
  }))
  return { slots, gap: parseFloat(getComputedStyle(track).columnGap) || 0 }
}

/** Two marquees moving in opposite directions; a clicked card expands across both rows. */
export function LikedWorkMarqueeRows({ rows }: { rows: [LikedWorkMarqueeItem[], LikedWorkMarqueeItem[]] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expansion, setExpansion] = useState<Expansion | null>(null)
  const collapse = useCallback(() => setExpansion(null), [])

  const toggleCard = useCallback((rowIndex: number, position: number) => {
    setExpansion((current) => {
      if (current?.rowIndex === rowIndex && current.position === position) return null

      const container = containerRef.current
      if (!container) return current
      const rowElements = [...container.querySelectorAll('[data-marquee-row]')]
      const measured = rowElements.map(measureRow)
      const clicked = measured[rowIndex]?.slots.find((slot) => slot.position === position)
      const otherTop = measured[1 - rowIndex]?.slots[0]?.top
      if (!clicked || otherTop === undefined) return current

      const rowRect = rowElements[rowIndex].getBoundingClientRect()
      const center = rowRect.left + rowRect.width / 2
      // Both rows share a card height, so the expanded card spans row distance plus one card.
      const span = Math.abs(otherTop - clicked.top) + clicked.height
      const aspectRatio = clicked.width / clicked.height
      // On narrow screens, shrink it to fit the viewport and center it between the rows.
      const expandedWidth = Math.min(span * aspectRatio, rowRect.width - EXPANDED_VIEWPORT_INSET * 2)
      const expandedHeight = expandedWidth / aspectRatio
      const expandedSize = { width: expandedWidth, height: expandedHeight, inset: (span - expandedHeight) / 2 }

      return {
        rowIndex,
        position,
        rows: measured.map(({ slots, gap }, index) => ({
          ...getMarqueeRowExpansion(
            slots,
            center,
            expandedWidth,
            gap,
            index === rowIndex ? position : undefined,
          ),
          ...(index === rowIndex ? { expandedSize } : {}),
        })),
      }
    })
  }, [])

  useEffect(() => {
    if (!expansion) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('[data-marquee-slot]') && containerRef.current?.contains(target)) return
      collapse()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') collapse()
    }
    // Mobile browsers fire resize as their toolbars hide, so only width changes count.
    const initialWidth = window.innerWidth
    const onResize = () => {
      if (window.innerWidth !== initialWidth) collapse()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [expansion, collapse])

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-(--liked-work-row-gap)"
      style={{ '--liked-work-row-gap': '16px' } as CSSProperties}
    >
      {rows.map((items, rowIndex) => (
        <LikedWorkMarquee
          key={rowIndex}
          items={items}
          rowIndex={rowIndex}
          direction={rowIndex === 0 ? 'left' : 'right'}
          label={rowIndex === 0 ? 'Most liked work' : 'More liked work'}
          expanded={Boolean(expansion)}
          expansion={expansion?.rows[rowIndex] ?? null}
          onToggleCard={toggleCard}
          onCollapse={collapse}
        />
      ))}
    </div>
  )
}

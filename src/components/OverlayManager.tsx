'use client'

import { useState, useMemo } from 'react'
import { BirthdayBalloons } from './BirthdayBalloons'
import { FloatingPill } from './FloatingPill'
import { OverlayEffects } from './OverlayEffects'

type OverlaySchedule = {
  effect: string
  startDate: string
  endDate?: string
  colorMode?: string
  repeatsYearly?: boolean
  pillEnabled?: boolean
  pillText?: string
  pillButtonLabel?: string
  pillButtonLink?: string
}

function toMMDD(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isActiveToday(schedule: OverlaySchedule): boolean {
  if (!schedule.startDate) return false

  const now = new Date()
  const todayMMDD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const start = toMMDD(schedule.startDate)
  const end = schedule.endDate ? toMMDD(schedule.endDate) : start

  return todayMMDD >= start && todayMMDD <= end
}

export function OverlayManager({ overlays }: { overlays: OverlaySchedule[] }) {
  const [dismissed, setDismissed] = useState(false)

  const active = useMemo(() => {
    if (dismissed) return null
    return overlays.find(isActiveToday) || null
  }, [overlays, dismissed])

  if (!active) return null

  return (
    <>
      <BirthdayBalloons force={active.effect === 'balloons'} />
      <FloatingPill
        enabled={!!active.pillEnabled}
        text={active.pillText || (active.effect === 'balloons' ? "It's my birthday! Help me support immigrant children" : '')}
        buttonLabel={active.pillButtonLabel || (active.effect === 'balloons' ? 'Donate to KIND' : '')}
        buttonLink={active.pillButtonLink || (active.effect === 'balloons' ? 'https://gofund.me/8ccd17bd' : '')}
        onDismiss={() => setDismissed(true)}
      />
      <OverlayEffects overlay={active.effect} colorMode={active.colorMode || 'both'} />
    </>
  )
}

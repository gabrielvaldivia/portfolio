'use client'

import { Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_TIMELINE_CHAPTERS,
  type TimelineChapter,
} from '../data/timelineContent'
import { LOCATION_CONTEXT } from '../data/timelineWorldContext'
import { HoverArrow } from './Icons'
import { RichText } from './RichText'
import {
  TimelineCursorGlobe,
  type GlobeLocation,
} from './TimelineCursorGlobe'
import { Calendar } from './ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/Popover'
import styles from './TimelineExperience.module.css'

const BIRTH_YEAR = 1987
const BIRTH_TIMESTAMP = Date.UTC(1987, 2, 23)
const TICKS_PER_YEAR = 1
const CHAPTER_PULL_THRESHOLD = 200
const DESKTOP_CHAPTER_PULL_INPUT_FACTOR = 0.5
const PREVIOUS_CHAPTER_CUE_DELAY = 100
const CHAPTER_CUE_FADE_PORTION = 0.75
const CHAPTER_CUE_PULL_FACTOR = 0.5
const CHAPTER_MOTION_EASE = 'cubic-bezier(0.22, 0.61, 0.24, 1)'
const CHAPTER_WHEEL_QUIET_MS = 80
const CHAPTER_BACKWARD_WHEEL_QUIET_MS = 220
const CHAPTER_EXIT_DURATION = 200
const CHAPTER_ENTER_DURATION = 420
const METADATA_SCRUB_PIXELS_PER_YEAR = 16
const AGE_SCRUB_PIXELS_PER_YEAR = 6
const METADATA_SCRUB_PIXELS_PER_STOP = 28
const METADATA_SCRUB_DRAG_THRESHOLD = 4
const LOCATION_GLOBE_MAX_LONGITUDE_OFFSET = 16
const LOCATION_GLOBE_ROTATION_DISTANCE = 90
const TIMELINE_TAP_DRAG_THRESHOLD = 8
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const PILL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

type TimelinePeriod = {
  startYear: number
  endYear: number
  label: string
}

type DatedTimelinePeriod = {
  start: number
  end: number
  label: string
  contextLabel?: string
  globeLocation?: GlobeLocation
}

type MetadataScrubSource = 'date' | 'age' | 'location' | 'education' | 'work'
type MetadataWheelSource = Extract<MetadataScrubSource, 'age' | 'location'>

type MetadataScrubSession = {
  pointerId: number
  source: MetadataScrubSource
  startX: number
  startPosition: number
  startStopIndex: number | null
  didDrag: boolean
}

type MetadataWheelSession = {
  source: MetadataWheelSource | null
  accumulatedDelta: number
  position: number
}

type TimelinePointerSession = {
  pointerId: number
  startX: number
  startY: number
  startRatio: number
  isHorizontal: boolean
  didDrag: boolean
}

const monthStart = (year: number, month: number) => Date.UTC(year, month - 1, 1)
const dayStart = (year: number, month: number, day: number) => (
  Date.UTC(year, month - 1, day)
)

const LOCATION_HISTORY: DatedTimelinePeriod[] = [
  { start: BIRTH_TIMESTAMP, end: dayStart(1989, 3, 23), label: 'Fomento, Cuba', contextLabel: 'Cuba', globeLocation: [22.1, -79.72] },
  { start: dayStart(1989, 3, 23), end: dayStart(1995, 7, 25), label: 'Sancti Spíritus, Cuba', contextLabel: 'Cuba', globeLocation: [21.93, -79.44] },
  { start: dayStart(1995, 7, 25), end: monthStart(1995, 10), label: 'Uruca, Costa Rica', contextLabel: 'Costa Rica', globeLocation: [9.95, -84.11] },
  { start: monthStart(1995, 10), end: monthStart(1996, 1), label: 'Tibás, Costa Rica', contextLabel: 'Costa Rica', globeLocation: [9.96, -84.08] },
  { start: monthStart(1996, 1), end: monthStart(1998, 1), label: 'Ciudad Quesada, Costa Rica', contextLabel: 'Costa Rica', globeLocation: [10.32, -84.43] },
  { start: monthStart(1998, 1), end: monthStart(2000, 1), label: 'Rohrmoser, Costa Rica', contextLabel: 'Costa Rica', globeLocation: [9.94, -84.12] },
  { start: monthStart(2000, 1), end: dayStart(2003, 10, 30), label: 'Uruca, Costa Rica', contextLabel: 'Costa Rica', globeLocation: [9.95, -84.11] },
  { start: dayStart(2003, 10, 30), end: monthStart(2012, 3), label: 'Tampa, FL', contextLabel: 'Tampa', globeLocation: [27.95, -82.46] },
  { start: monthStart(2012, 3), end: monthStart(2012, 11), label: 'Los Angeles, CA', contextLabel: 'Los Angeles', globeLocation: [34.05, -118.24] },
  { start: monthStart(2012, 11), end: monthStart(2015, 2), label: 'San Francisco, CA', contextLabel: 'San Francisco', globeLocation: [37.77, -122.42] },
  { start: monthStart(2015, 2), end: monthStart(2016, 1), label: 'London, England', globeLocation: [51.51, -0.13] },
  { start: monthStart(2016, 1), end: dayStart(2017, 11, 17), label: 'San Francisco, CA', contextLabel: 'San Francisco', globeLocation: [37.77, -122.42] },
  { start: dayStart(2017, 11, 17), end: monthStart(2021, 3), label: 'New York, NY', contextLabel: 'New York City', globeLocation: [40.71, -74.01] },
  { start: monthStart(2021, 3), end: Number.POSITIVE_INFINITY, label: 'Brooklyn, NY', contextLabel: 'New York City', globeLocation: [40.68, -73.94] },
]

const getDatedPeriodGlobeLocation = (
  periods: DatedTimelinePeriod[],
  timestamp: number,
) => periods.find(
  ({ start, end }) => timestamp >= start && timestamp < end,
)?.globeLocation ?? [21.52, -77.78]

const EDUCATION_HISTORY: TimelinePeriod[] = [
  { startYear: 1988, endYear: 1991, label: 'Los Muñequitos' },
  { startYear: 1992, endYear: 1993, label: 'Los Muñequitos' },
  { startYear: 1994, endYear: 1994, label: 'Julio Antonio Mella' },
  { startYear: 1995, endYear: 1995, label: 'Julio Antonio Mella' },
  { startYear: 1996, endYear: 1996, label: 'Ciudad Quesada' },
  { startYear: 1997, endYear: 1997, label: 'Chaves' },
  { startYear: 1998, endYear: 1999, label: 'Santa Catalina' },
  { startYear: 2000, endYear: 2000, label: 'Los Angeles' },
  { startYear: 2001, endYear: 2003, label: 'Don Bosco' },
  { startYear: 2004, endYear: 2005, label: 'Leto High School' },
  { startYear: 2006, endYear: 2007, label: 'HCC' },
  { startYear: 2008, endYear: 2010, label: 'Art Institute' },
]

const WORK_HISTORY: DatedTimelinePeriod[] = [
  { start: monthStart(2005, 7), end: monthStart(2006, 1), label: 'La Teresita' },
  { start: monthStart(2006, 1), end: monthStart(2006, 7), label: 'American Supply' },
  { start: monthStart(2006, 9), end: monthStart(2007, 1), label: 'Credit Advisor' },
  { start: monthStart(2007, 8), end: monthStart(2008, 2), label: 'OTH' },
  { start: monthStart(2008, 3), end: monthStart(2008, 7), label: 'Collections' },
  { start: monthStart(2008, 7), end: monthStart(2008, 11), label: 'Lithobinder' },
  { start: monthStart(2008, 11), end: monthStart(2009, 3), label: 'Auto Trader' },
  { start: monthStart(2009, 3), end: monthStart(2010, 4), label: 'Imagemedia' },
  { start: monthStart(2010, 4), end: monthStart(2010, 10), label: 'Cefco' },
  { start: monthStart(2010, 10), end: monthStart(2011, 6), label: 'Momentum Mobile' },
  { start: monthStart(2011, 6), end: monthStart(2012, 3), label: 'Mad Mobile' },
  { start: monthStart(2012, 3), end: monthStart(2012, 11), label: 'Mopro' },
  { start: monthStart(2012, 11), end: monthStart(2014, 1), label: 'Automatic' },
  { start: monthStart(2014, 1), end: monthStart(2017, 11), label: 'Facebook' },
  { start: monthStart(2017, 11), end: monthStart(2019, 7), label: 'Google' },
  { start: monthStart(2019, 7), end: monthStart(2020, 4), label: 'Canopy' },
  { start: monthStart(2020, 4), end: monthStart(2021, 3), label: 'CNN' },
  { start: monthStart(2021, 3), end: monthStart(2023, 9), label: 'Patreon' },
  { start: monthStart(2023, 9), end: Number.POSITIVE_INFINITY, label: 'Valdivia Works' },
]

const getMetadataScrubStops = (source: MetadataScrubSource) => {
  if (source === 'location') {
    return LOCATION_HISTORY.map((period) => period.start)
  }
  if (source === 'education') {
    return EDUCATION_HISTORY.map((period) => Date.UTC(period.startYear, 0, 1))
  }
  if (source === 'work') {
    return WORK_HISTORY.map((period) => period.start)
  }
  return null
}

const getScrubStopIndex = (stops: readonly number[], timestamp: number) => {
  const firstFutureIndex = stops.findIndex((stop) => stop > timestamp)
  if (firstFutureIndex === -1) return stops.length - 1
  return Math.max(0, firstFutureIndex - 1)
}

const CHAPTER_STARTS = [
  monthStart(2001, 1), // Don Bosco, Leto, HCC, and Art Institute
  monthStart(2010, 10), // Momentum Mobile + Mad Mobile
  monthStart(2012, 3), // Mopro
  monthStart(2012, 11), // Automatic
  monthStart(2014, 1), // Facebook
  monthStart(2017, 11), // Google
  monthStart(2019, 7), // Canopy
  monthStart(2020, 4), // CNN
  monthStart(2021, 3), // Patreon
  monthStart(2023, 9), // Valdivia Works
]

const getPeriodLabel = (periods: TimelinePeriod[], year: number) => periods.find(
  ({ startYear, endYear }) => year >= startYear && year <= endYear,
)?.label ?? '—'

const getDatedPeriodLabel = (periods: DatedTimelinePeriod[], timestamp: number) => periods.find(
  ({ start, end }) => timestamp >= start && timestamp < end,
)?.label ?? '—'

const getDatedPeriodContextLabel = (periods: DatedTimelinePeriod[], timestamp: number) => {
  const period = periods.find(({ start, end }) => timestamp >= start && timestamp < end)

  return period?.contextLabel ?? period?.label ?? '—'
}

const getChapterIndex = (timestamp: number) => {
  for (let index = CHAPTER_STARTS.length - 1; index >= 0; index -= 1) {
    if (timestamp >= CHAPTER_STARTS[index]) {
      return index + 1
    }
  }

  return 0
}

const CHAPTER_BOUNDARIES = [BIRTH_TIMESTAMP, ...CHAPTER_STARTS]

const getChapterRangeLabel = (chapterIndex: number) => {
  const startDate = new Date(CHAPTER_BOUNDARIES[chapterIndex])
  const isCurrentChapter = chapterIndex === CHAPTER_BOUNDARIES.length - 1

  if (isCurrentChapter) {
    return `${MONTH_YEAR_FORMATTER.format(startDate)} – Present`
  }

  const endDate = new Date(CHAPTER_BOUNDARIES[chapterIndex + 1] - 1)
  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear()

  return sameYear
    ? `${MONTH_FORMATTER.format(startDate)} – ${MONTH_YEAR_FORMATTER.format(endDate)}`
    : `${MONTH_YEAR_FORMATTER.format(startDate)} – ${MONTH_YEAR_FORMATTER.format(endDate)}`
}
const CHAPTER_YEARS = new Set(
  CHAPTER_STARTS.map((timestamp) => new Date(timestamp).getUTCFullYear()),
)
export function TimelineExperience({
  chapters = DEFAULT_TIMELINE_CHAPTERS,
  presentDate,
}: {
  chapters?: readonly TimelineChapter[]
  presentDate: string
}) {
  const [presentYear, presentMonth, presentDay] = presentDate.split('-').map(Number)
  const presentTimestamp = Date.UTC(presentYear, presentMonth - 1, presentDay)
  const lastIndex = presentYear - BIRTH_YEAR
  const railTicks = useMemo(() => {
    const yearTicks = Array.from(
      { length: (presentYear - BIRTH_YEAR) * TICKS_PER_YEAR + 1 },
      (_, index) => ({
        id: index === 0 ? 'prologue' : `year-${BIRTH_YEAR + index}`,
        position: index / ((presentYear - BIRTH_YEAR) * TICKS_PER_YEAR),
        year: BIRTH_YEAR + index,
        isChapter: index === 0,
        compactIndex: index === 0 ? 0 : null,
      }),
    ).filter(({ year }) => !CHAPTER_YEARS.has(year))
    const chapterTicks = CHAPTER_STARTS.map((timestamp, index) => ({
      id: `chapter-${index + 1}`,
      position: (timestamp - BIRTH_TIMESTAMP) / (presentTimestamp - BIRTH_TIMESTAMP),
      year: new Date(timestamp).getUTCFullYear(),
      isChapter: true,
      compactIndex: index + 1,
    }))

    return [...yearTicks, ...chapterTicks].sort((a, b) => a.position - b.position)
  }, [presentTimestamp, presentYear])
  const getNearestTickIndex = useCallback((position: number) => {
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    railTicks.forEach((tick, index) => {
      const distance = Math.abs(tick.position - position)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    return nearestIndex
  }, [railTicks])
  const [displayPosition, setDisplayPosition] = useState(0)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [isTimelineDragging, setIsTimelineDragging] = useState(false)
  const [isDateEditing, setIsDateEditing] = useState(false)
  const [metadataScrubSource, setMetadataScrubSource] = useState<MetadataScrubSource | null>(null)
  const [isAgePortraitVisible, setIsAgePortraitVisible] = useState(false)
  const [isBeyondPresentPreview, setIsBeyondPresentPreview] = useState(false)
  const [isLocationGlobeVisible, setIsLocationGlobeVisible] = useState(false)
  const [locationGlobePortalRoot, setLocationGlobePortalRoot] = useState<HTMLElement | null>(null)
  const hoverProgressRef = useRef<number | null>(null)
  const targetRef = useRef(0)
  const positionRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const experienceRef = useRef<HTMLElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const storyRef = useRef<HTMLElement | null>(null)
  const chapterScrollRef = useRef<HTMLDivElement | null>(null)
  const chapterMotionRef = useRef<HTMLDivElement | null>(null)
  const chapterDescriptionRef = useRef<HTMLDivElement | null>(null)
  const hoverLockRef = useRef(false)
  const hapticTickRef = useRef<number | null>(null)
  const scrollSyncLockRef = useRef(false)
  const scrollSyncFrameRef = useRef<number | null>(null)
  const chapterPullDistanceRef = useRef(0)
  const chapterPullDirectionRef = useRef(0)
  const chapterPullIdleTimerRef = useRef<number | null>(null)
  const chapterMotionCleanupTimerRef = useRef<number | null>(null)
  const chapterTransitionTimerRef = useRef<number | null>(null)
  const chapterEnterFrameRef = useRef<number | null>(null)
  const chapterTransitioningRef = useRef(false)
  const chapterTransitionDirectionRef = useRef(0)
  const chapterTransitionMinimumEndRef = useRef(0)
  const chapterWheelUnlockTimerRef = useRef<number | null>(null)
  const chapterWheelHandlerRef = useRef<(event: WheelEvent) => void>(() => {})
  const chapterDeltaHandlerRef = useRef<(
    deltaY: number,
    preventDefault: () => void,
  ) => void>(() => {})
  const previousChapterCueRef = useRef<HTMLDivElement | null>(null)
  const nextChapterCueRef = useRef<HTMLDivElement | null>(null)
  const mobilePreviousChapterCueRef = useRef<HTMLDivElement | null>(null)
  const mobileNextChapterCueRef = useRef<HTMLDivElement | null>(null)
  const mobileChapterCueBaseOffsetRef = useRef(0)
  const pendingChapterScrollRef = useRef<{ index: number; ratio: number } | null>(null)
  const urlDateReadyRef = useRef(false)
  const pendingUrlDateRef = useRef<string | null>(null)
  const urlSyncTimerRef = useRef<number | null>(null)
  const metadataScrubSessionRef = useRef<MetadataScrubSession | null>(null)
  const metadataWheelSessionRef = useRef<MetadataWheelSession>({
    source: null,
    accumulatedDelta: 0,
    position: 0,
  })
  const metadataWheelResetTimerRef = useRef<number | null>(null)
  const metadataScrubFrameRef = useRef<number | null>(null)
  const pendingMetadataPositionRef = useRef<number | null>(null)
  const suppressDateClickRef = useRef(false)
  const suppressDateClickTimerRef = useRef<number | null>(null)
  const timelinePointerSessionRef = useRef<TimelinePointerSession | null>(null)
  const ageValueRef = useRef<HTMLSpanElement | null>(null)
  const agePortraitRef = useRef<HTMLDivElement | null>(null)
  const agePortraitFrameRef = useRef<number | null>(null)
  const pendingAgePortraitPositionRef = useRef<{ x: number; y: number } | null>(null)
  const agePortraitAnchorXRef = useRef<number | null>(null)
  const agePortraitAnchorYRef = useRef<number | null>(null)
  const locationGlobeRef = useRef<HTMLDivElement | null>(null)
  const locationGlobeFrameRef = useRef<number | null>(null)
  const pendingLocationGlobePositionRef = useRef<{ x: number; y: number } | null>(null)
  const locationGlobeAnchorXRef = useRef<number | null>(null)
  const locationGlobeAnchorYRef = useRef<number | null>(null)
  const locationGlobeLongitudeOffsetRef = useRef(0)

  useLayoutEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previousRootOverflow = root.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousScrollRestoration = window.history.scrollRestoration

    window.history.scrollRestoration = 'manual'
    root.scrollTop = 0
    body.scrollTop = 0
    window.scrollTo(0, 0)
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      root.style.overflow = previousRootOverflow
      body.style.overflow = previousBodyOverflow
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useEffect(() => {
    setLocationGlobePortalRoot(document.body)
  }, [])

  const getChapterScrollElement = () => {
    if (typeof window === 'undefined') return chapterScrollRef.current
    if (window.matchMedia('(min-width: 1280px)').matches) {
      return chapterScrollRef.current
    }
    if (window.matchMedia('(min-width: 810px)').matches) {
      return storyRef.current
    }
    return stageRef.current
  }

  const prepareHapticPosition = useCallback((position: number) => {
    hapticTickRef.current = getNearestTickIndex(position)
  }, [getNearestTickIndex])

  const pulseHapticAt = useCallback((position: number) => {
    const nextTickIndex = getNearestTickIndex(position)
    const previousTickIndex = hapticTickRef.current

    if (previousTickIndex === null) {
      hapticTickRef.current = nextTickIndex
      return
    }

    if (nextTickIndex === previousTickIndex) return

    const firstCrossedIndex = Math.min(previousTickIndex, nextTickIndex)
    const lastCrossedIndex = Math.max(previousTickIndex, nextTickIndex)
    const crossedChapter = railTicks
      .slice(firstCrossedIndex, lastCrossedIndex + 1)
      .some((tick) => tick.isChapter)

    hapticTickRef.current = nextTickIndex
    navigator.vibrate?.(crossedChapter ? 12 : 5)
  }, [getNearestTickIndex, railTicks])

  const animate = useCallback(() => {
    const distance = targetRef.current - positionRef.current
    const next = Math.abs(distance) < 0.002
      ? targetRef.current
      : positionRef.current + distance * 0.16

    positionRef.current = next
    setDisplayPosition(next)

    if (next !== targetRef.current) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      animationRef.current = null
    }
  }, [])

  const moveTo = useCallback((next: number) => {
    setIsBeyondPresentPreview(false)
    targetRef.current = Math.max(0, Math.min(lastIndex, next))

    if (animationRef.current === null) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [animate, lastIndex])

  const snapTo = useCallback((next: number) => {
    setIsBeyondPresentPreview(false)
    const clamped = Math.max(0, Math.min(lastIndex, next))
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    targetRef.current = clamped
    positionRef.current = clamped
    setDisplayPosition(clamped)
  }, [lastIndex])

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      if (scrollSyncFrameRef.current !== null) cancelAnimationFrame(scrollSyncFrameRef.current)
      if (chapterEnterFrameRef.current !== null) cancelAnimationFrame(chapterEnterFrameRef.current)
      if (chapterPullIdleTimerRef.current !== null) window.clearTimeout(chapterPullIdleTimerRef.current)
      if (chapterMotionCleanupTimerRef.current !== null) {
        window.clearTimeout(chapterMotionCleanupTimerRef.current)
      }
      if (chapterTransitionTimerRef.current !== null) {
        window.clearTimeout(chapterTransitionTimerRef.current)
      }
      if (chapterWheelUnlockTimerRef.current !== null) {
        window.clearTimeout(chapterWheelUnlockTimerRef.current)
      }
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current)
      }
      if (metadataScrubFrameRef.current !== null) {
        cancelAnimationFrame(metadataScrubFrameRef.current)
      }
      if (metadataWheelResetTimerRef.current !== null) {
        window.clearTimeout(metadataWheelResetTimerRef.current)
      }
      if (suppressDateClickTimerRef.current !== null) {
        window.clearTimeout(suppressDateClickTimerRef.current)
      }
      if (agePortraitFrameRef.current !== null) {
        cancelAnimationFrame(agePortraitFrameRef.current)
      }
      if (locationGlobeFrameRef.current !== null) {
        cancelAnimationFrame(locationGlobeFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const experience = experienceRef.current
    if (!experience) return

    const visualViewport = window.visualViewport
    let frame: number | null = null

    const updateVisibleViewport = () => {
      frame = null
      experience.style.setProperty(
        '--mobile-visible-viewport-height',
        `${visualViewport?.height ?? window.innerHeight}px`,
      )
      experience.style.setProperty(
        '--mobile-visible-viewport-offset-top',
        `${visualViewport?.offsetTop ?? 0}px`,
      )
    }

    const scheduleVisibleViewportUpdate = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(updateVisibleViewport)
    }

    updateVisibleViewport()
    window.addEventListener('resize', scheduleVisibleViewportUpdate)
    window.addEventListener('orientationchange', scheduleVisibleViewportUpdate)
    visualViewport?.addEventListener('resize', scheduleVisibleViewportUpdate)
    visualViewport?.addEventListener('scroll', scheduleVisibleViewportUpdate)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleVisibleViewportUpdate)
      window.removeEventListener('orientationchange', scheduleVisibleViewportUpdate)
      visualViewport?.removeEventListener('resize', scheduleVisibleViewportUpdate)
      visualViewport?.removeEventListener('scroll', scheduleVisibleViewportUpdate)
    }
  }, [])

  const progress = displayPosition / lastIndex
  const pillProgress = hoverProgress ?? progress
  const contentTimestamp = Math.round(
    BIRTH_TIMESTAMP + progress * (presentTimestamp - BIRTH_TIMESTAMP),
  )
  const contentDate = new Date(contentTimestamp)
  const contentYear = contentDate.getUTCFullYear()
  const isBeforeBirthday = contentDate.getUTCMonth() < 2
    || (contentDate.getUTCMonth() === 2 && contentDate.getUTCDate() < 23)
  const contentAge = contentYear - BIRTH_YEAR - (isBeforeBirthday ? 1 : 0)
  const contentAgeLabel = contentAge === 0 ? 'Newborn' : contentAge
  const contentAgePortrait = `/timeline-faces/age-${String(contentAge).padStart(2, '0')}.webp`
  const contentDateLabel = FULL_DATE_FORMATTER.format(contentDate)
  const contentDateTime = contentDate.toISOString().slice(0, 10)
  const pillTimestamp = Math.round(
    BIRTH_TIMESTAMP + pillProgress * (presentTimestamp - BIRTH_TIMESTAMP),
  )
  const pillDate = new Date(pillTimestamp)
  const pillLabel = PILL_DATE_FORMATTER.format(pillDate)
  const previewYear = pillDate.getUTCFullYear()
  const previewIsBeforeBirthday = pillDate.getUTCMonth() < 2
    || (pillDate.getUTCMonth() === 2 && pillDate.getUTCDate() < 23)
  const previewAge = previewYear - BIRTH_YEAR - (previewIsBeforeBirthday ? 1 : 0)
  const previewAgeLabel = previewAge === 0 ? 'Newborn' : previewAge
  const previewDateLabel = FULL_DATE_FORMATTER.format(pillDate)
  const previewDateTime = pillDate.toISOString().slice(0, 10)
  const previewLocationDetails = getDatedPeriodLabel(LOCATION_HISTORY, pillTimestamp)
  const previewLocationContextLabel = getDatedPeriodContextLabel(LOCATION_HISTORY, pillTimestamp)
  const previewEducationDetails = getPeriodLabel(EDUCATION_HISTORY, previewYear)
  const previewWorkDetails = getDatedPeriodLabel(WORK_HISTORY, pillTimestamp)
  const previewWorldContext = LOCATION_CONTEXT?.[previewLocationContextLabel]?.[previewYear]
  const locationDetails = getDatedPeriodLabel(LOCATION_HISTORY, contentTimestamp)
  const locationGlobe = getDatedPeriodGlobeLocation(LOCATION_HISTORY, contentTimestamp)
  const locationContextLabel = getDatedPeriodContextLabel(LOCATION_HISTORY, contentTimestamp)
  const educationDetails = getPeriodLabel(EDUCATION_HISTORY, contentYear)
  const workDetails = getDatedPeriodLabel(WORK_HISTORY, contentDate.getTime())
  const contentChapterIndex = getChapterIndex(contentDate.getTime())
  const contentChapterLabel = contentChapterIndex === 0
    ? 'Prologue'
    : `Chapter ${contentChapterIndex} of ${CHAPTER_BOUNDARIES.length}`
  const contentChapterRangeLabel = getChapterRangeLabel(contentChapterIndex)
  const contentTitle = chapters[contentChapterIndex].title
  const contentRichText = chapters[contentChapterIndex].content
  const worldContext = LOCATION_CONTEXT?.[locationContextLabel]?.[contentYear]
  const previousChapterLabel = contentChapterIndex === 1
    ? 'Prologue'
    : `Chapter ${contentChapterIndex - 1}`
  const nextChapterLabel = `Chapter ${contentChapterIndex + 1}`

  const getChapterTimestampRange = (chapterIndex: number) => {
    const start = CHAPTER_BOUNDARIES[chapterIndex]
    const boundaryEnd = CHAPTER_BOUNDARIES[chapterIndex + 1] ?? presentTimestamp
    const end = chapterIndex === CHAPTER_BOUNDARIES.length - 1
      ? boundaryEnd
      : boundaryEnd - 1

    return { start, end }
  }

  const clearChapterMotionCleanup = () => {
    if (chapterMotionCleanupTimerRef.current !== null) {
      window.clearTimeout(chapterMotionCleanupTimerRef.current)
      chapterMotionCleanupTimerRef.current = null
    }
  }

  const scheduleChapterWheelUnlock = (quietTime = CHAPTER_WHEEL_QUIET_MS) => {
    if (chapterWheelUnlockTimerRef.current !== null) {
      window.clearTimeout(chapterWheelUnlockTimerRef.current)
    }

    const animationTimeRemaining = Math.max(
      0,
      chapterTransitionMinimumEndRef.current - performance.now(),
    )
    chapterWheelUnlockTimerRef.current = window.setTimeout(() => {
      getChapterScrollElement()?.style.removeProperty('overflow-y')
      chapterTransitioningRef.current = false
      chapterTransitionDirectionRef.current = 0
      chapterWheelUnlockTimerRef.current = null
    }, Math.max(quietTime, animationTimeRemaining))
  }

  const resetChapterCues = () => {
    mobileChapterCueBaseOffsetRef.current = 0
    ;[
      previousChapterCueRef.current,
      nextChapterCueRef.current,
      mobilePreviousChapterCueRef.current,
      mobileNextChapterCueRef.current,
    ].forEach((cue) => {
      cue?.style.removeProperty('opacity')
      cue?.style.removeProperty('transform')
      cue?.style.removeProperty('will-change')
    })
  }

  const measureMobileChapterCueOffset = (direction: number) => {
    const cue = direction < 0
      ? mobilePreviousChapterCueRef.current
      : mobileNextChapterCueRef.current
    const experience = experienceRef.current
    const motion = chapterMotionRef.current

    if (!cue || !experience || !motion) return 0

    const cueRect = cue.getBoundingClientRect()
    const experienceRect = experience.getBoundingClientRect()

    if (direction < 0) {
      const contentTop = motion
        .querySelector<HTMLElement>(`.${styles.chapterEyebrow}`)
        ?.getBoundingClientRect().top ?? motion.getBoundingClientRect().top
      const midpoint = experienceRect.top + (contentTop - experienceRect.top) / 2

      return midpoint - (cueRect.top + cueRect.height / 2)
    }

    const contentBottom = chapterDescriptionRef.current?.getBoundingClientRect().bottom
      ?? motion.getBoundingClientRect().bottom
    const timelineTop = railRef.current
      ?.querySelector<HTMLElement>(`.${styles.activeTick}`)
      ?.getBoundingClientRect().top

    if (timelineTop === undefined) return 0

    const midpoint = contentBottom + (timelineTop - contentBottom) / 2

    return midpoint - (cueRect.top + cueRect.height / 2)
  }

  const releaseChapterMotion = () => {
    resetChapterCues()

    const motion = chapterMotionRef.current
    if (!motion) return

    clearChapterMotionCleanup()
    motion.style.willChange = 'transform'
    motion.style.transition = `transform 360ms ${CHAPTER_MOTION_EASE}`
    motion.style.transform = 'translate3d(0, 0, 0)'
    chapterMotionCleanupTimerRef.current = window.setTimeout(() => {
      motion.style.removeProperty('transition')
      motion.style.removeProperty('transform')
      motion.style.removeProperty('will-change')
      chapterMotionCleanupTimerRef.current = null
    }, 380)
  }

  useEffect(() => {
    resetChapterCues()

    const element = getChapterScrollElement()
    if (!element) return

    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    const pendingScroll = pendingChapterScrollRef.current
    const { start, end } = getChapterTimestampRange(contentChapterIndex)
    const selectedTimestamp = Math.round(
      BIRTH_TIMESTAMP
        + (positionRef.current / lastIndex) * (presentTimestamp - BIRTH_TIMESTAMP),
    )
    const selectedRatio = end === start
      ? 0
      : Math.max(0, Math.min(1, (selectedTimestamp - start) / (end - start)))
    const resetMobileChapter = hoverProgressRef.current !== null
      && window.matchMedia('(max-width: 809px)').matches
    const scrollRatio = resetMobileChapter
      ? 0
      : pendingScroll?.index === contentChapterIndex
        ? pendingScroll.ratio
        : selectedRatio

    if (pendingScroll?.index === contentChapterIndex) {
      pendingChapterScrollRef.current = null
    }

    scrollSyncLockRef.current = true
    element.scrollTop = scrollRatio * maxScroll

    if (scrollSyncFrameRef.current !== null) {
      cancelAnimationFrame(scrollSyncFrameRef.current)
    }
    scrollSyncFrameRef.current = requestAnimationFrame(() => {
      scrollSyncLockRef.current = false
      scrollSyncFrameRef.current = null
    })

    const transitionDirection = chapterTransitionDirectionRef.current
    const motion = chapterMotionRef.current
    if (motion && transitionDirection !== 0) {
      if (chapterEnterFrameRef.current !== null) {
        cancelAnimationFrame(chapterEnterFrameRef.current)
      }
      clearChapterMotionCleanup()
      chapterTransitionMinimumEndRef.current = Math.max(
        chapterTransitionMinimumEndRef.current,
        performance.now() + CHAPTER_ENTER_DURATION + 40,
      )
      motion.style.willChange = 'transform, opacity'
      motion.style.transition = 'none'
      motion.style.opacity = '0'
      motion.style.transform = `translate3d(0, ${transitionDirection * 48}px, 0)`
      chapterEnterFrameRef.current = requestAnimationFrame(() => {
        motion.style.transition = `transform ${CHAPTER_ENTER_DURATION}ms ${CHAPTER_MOTION_EASE}, opacity 300ms ease-out`
        motion.style.opacity = '1'
        motion.style.transform = 'translate3d(0, 0, 0)'
        chapterEnterFrameRef.current = null
      })
      chapterMotionCleanupTimerRef.current = window.setTimeout(() => {
        motion.style.removeProperty('transition')
        motion.style.removeProperty('transform')
        motion.style.removeProperty('opacity')
        motion.style.removeProperty('will-change')
        chapterMotionCleanupTimerRef.current = null
        scheduleChapterWheelUnlock(
          transitionDirection < 0
            ? CHAPTER_BACKWARD_WHEEL_QUIET_MS
            : CHAPTER_WHEEL_QUIET_MS,
        )
      }, CHAPTER_ENTER_DURATION + 40)
    }
  }, [contentChapterIndex, lastIndex])

  const moveToChapter = (chapterIndex: number, scrollRatio = 0) => {
    const nextChapterIndex = Math.max(
      0,
      Math.min(CHAPTER_BOUNDARIES.length - 1, chapterIndex),
    )
    const { start, end } = getChapterTimestampRange(nextChapterIndex)
    const clampedScrollRatio = Math.max(0, Math.min(1, scrollRatio))
    const timestamp = Math.round(start + (end - start) * clampedScrollRatio)
    const nextProgress = (timestamp - BIRTH_TIMESTAMP)
      / (presentTimestamp - BIRTH_TIMESTAMP)

    pendingChapterScrollRef.current = {
      index: nextChapterIndex,
      ratio: clampedScrollRatio,
    }
    const chapterScroll = getChapterScrollElement()
    if (chapterScroll && clampedScrollRatio === 0) {
      scrollSyncLockRef.current = true
      chapterScroll.scrollTop = 0
      if (scrollSyncFrameRef.current !== null) {
        cancelAnimationFrame(scrollSyncFrameRef.current)
      }
      scrollSyncFrameRef.current = requestAnimationFrame(() => {
        scrollSyncLockRef.current = false
        scrollSyncFrameRef.current = null
      })
    }
    hoverProgressRef.current = null
    setHoverProgress(null)
    setIsTimelineDragging(false)
    moveTo(nextProgress * lastIndex)
    navigator.vibrate?.(12)
  }

  const navigateToDate = (dateValue: string) => {
    const [year, month, day] = dateValue.split('-').map(Number)
    if (!year || !month || !day) {
      setIsDateEditing(false)
      return
    }

    const requestedTimestamp = Date.UTC(year, month - 1, day)
    if (new Date(requestedTimestamp).toISOString().slice(0, 10) !== dateValue) {
      setIsDateEditing(false)
      return
    }

    const timestamp = Math.max(
      BIRTH_TIMESTAMP,
      Math.min(presentTimestamp, requestedTimestamp),
    )
    const nextChapterIndex = getChapterIndex(timestamp)
    const { start, end } = getChapterTimestampRange(nextChapterIndex)
    const scrollRatio = end === start
      ? 0
      : Math.max(0, Math.min(1, (timestamp - start) / (end - start)))
    const nextProgress = (timestamp - BIRTH_TIMESTAMP)
      / (presentTimestamp - BIRTH_TIMESTAMP)

    if (nextChapterIndex === contentChapterIndex) {
      pendingChapterScrollRef.current = null
      const chapterScroll = getChapterScrollElement()
      if (chapterScroll) {
        const maxScroll = Math.max(0, chapterScroll.scrollHeight - chapterScroll.clientHeight)
        scrollSyncLockRef.current = true
        chapterScroll.scrollTop = scrollRatio * maxScroll
        if (scrollSyncFrameRef.current !== null) {
          cancelAnimationFrame(scrollSyncFrameRef.current)
        }
        scrollSyncFrameRef.current = requestAnimationFrame(() => {
          scrollSyncLockRef.current = false
          scrollSyncFrameRef.current = null
        })
      }
    } else {
      pendingChapterScrollRef.current = {
        index: nextChapterIndex,
        ratio: scrollRatio,
      }
    }

    setIsDateEditing(false)
    hoverProgressRef.current = null
    setHoverProgress(null)
    snapTo(nextProgress * lastIndex)
    navigator.vibrate?.(12)
  }

  useEffect(() => {
    const requestedDate = new URL(window.location.href).searchParams.get('date')
    if (!requestedDate) {
      urlDateReadyRef.current = true
      return
    }

    const [year, month, day] = requestedDate.split('-').map(Number)
    if (!year || !month || !day) {
      urlDateReadyRef.current = true
      return
    }

    const requestedTimestamp = Date.UTC(year, month - 1, day)
    if (new Date(requestedTimestamp).toISOString().slice(0, 10) !== requestedDate) {
      urlDateReadyRef.current = true
      return
    }

    const timestamp = Math.max(
      BIRTH_TIMESTAMP,
      Math.min(presentTimestamp, requestedTimestamp),
    )
    const normalizedDate = new Date(timestamp).toISOString().slice(0, 10)
    pendingUrlDateRef.current = normalizedDate
    navigateToDate(normalizedDate)
  }, [])

  useEffect(() => {
    const pendingDate = pendingUrlDateRef.current
    if (pendingDate && contentDateTime !== pendingDate) return

    if (pendingDate) {
      pendingUrlDateRef.current = null
      urlDateReadyRef.current = true
    }
    if (!urlDateReadyRef.current) return

    if (urlSyncTimerRef.current !== null) {
      window.clearTimeout(urlSyncTimerRef.current)
    }
    urlSyncTimerRef.current = window.setTimeout(() => {
      const url = new URL(window.location.href)
      if (url.searchParams.get('date') === contentDateTime) {
        urlSyncTimerRef.current = null
        return
      }
      url.searchParams.set('date', contentDateTime)
      window.history.replaceState(window.history.state, '', url)
      urlSyncTimerRef.current = null
    }, 80)

    return () => {
      if (urlSyncTimerRef.current !== null) {
        window.clearTimeout(urlSyncTimerRef.current)
        urlSyncTimerRef.current = null
      }
    }
  }, [contentDateTime])

  const handleChapterScroll = (event: React.UIEvent<HTMLElement>) => {
    const element = event.currentTarget
    if (element !== getChapterScrollElement()) return
    element.dataset.scrolled = element.scrollTop > 1 ? 'true' : 'false'
    if (chapterTransitioningRef.current) return

    if (scrollSyncLockRef.current) return

    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    if (maxScroll === 0) return

    const scrollRatio = Math.max(0, Math.min(1, element.scrollTop / maxScroll))
    const { start, end } = getChapterTimestampRange(contentChapterIndex)
    const timestamp = Math.round(start + (end - start) * scrollRatio)
    const nextPosition = ((timestamp - BIRTH_TIMESTAMP)
      / (presentTimestamp - BIRTH_TIMESTAMP)) * lastIndex

    if (hoverProgressRef.current !== null) {
      hoverProgressRef.current = null
      setHoverProgress(null)
    }

    snapTo(nextPosition)
    pulseHapticAt(nextPosition / lastIndex)

    if (scrollRatio > 0.01 && scrollRatio < 0.99) {
      const wasPulling = chapterPullDistanceRef.current !== 0
        || chapterPullDirectionRef.current !== 0
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = 0
      if (chapterPullIdleTimerRef.current !== null) {
        window.clearTimeout(chapterPullIdleTimerRef.current)
        chapterPullIdleTimerRef.current = null
      }
      if (wasPulling) releaseChapterMotion()
    }
  }

  const handleChapterDelta = (deltaY: number, preventDefault: () => void) => {
    if (deltaY === 0) return
    if (chapterTransitioningRef.current) {
      preventDefault()
      if (chapterTransitionDirectionRef.current < 0) {
        scheduleChapterWheelUnlock(CHAPTER_BACKWARD_WHEEL_QUIET_MS)
      }
      return
    }

    const element = getChapterScrollElement()
    if (!element) return
    const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight)
    const direction = Math.sign(deltaY)
    const atStart = element.scrollTop <= 1
    const atEnd = element.scrollTop >= maxScroll - 1
    const pullingPastEdge = direction < 0 ? atStart : atEnd
    const nextChapterIndex = contentChapterIndex + direction
    const canChangeChapter = nextChapterIndex >= 0
      && nextChapterIndex < CHAPTER_BOUNDARIES.length

    if (!pullingPastEdge || !canChangeChapter) {
      const wasPulling = chapterPullDistanceRef.current !== 0
        || chapterPullDirectionRef.current !== 0
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = 0
      if (wasPulling) releaseChapterMotion()
      return
    }

    preventDefault()

    const isMobile = window.matchMedia('(max-width: 809px)').matches

    if (chapterPullDirectionRef.current !== direction) {
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = direction
      mobileChapterCueBaseOffsetRef.current = isMobile
        ? measureMobileChapterCueOffset(direction)
        : 0
    }

    const pullInputFactor = isMobile ? 1 : DESKTOP_CHAPTER_PULL_INPUT_FACTOR
    chapterPullDistanceRef.current += Math.abs(deltaY) * pullInputFactor
    const pullThreshold = CHAPTER_PULL_THRESHOLD
    const cueDelay = direction < 0
      ? PREVIOUS_CHAPTER_CUE_DELAY
      : 0
    const cueFadeDistance = (pullThreshold - cueDelay) * CHAPTER_CUE_FADE_PORTION
    const cueProgress = Math.max(0, Math.min(
      1,
      (chapterPullDistanceRef.current - cueDelay) / cueFadeDistance,
    ))
    const signedPull = chapterPullDistanceRef.current * direction
    const chapterOffset = Math.sign(signedPull) * Math.min(
      Math.abs(signedPull),
      pullThreshold,
    )
    const motion = chapterMotionRef.current
    const activeCues = direction < 0
      ? [previousChapterCueRef.current, mobilePreviousChapterCueRef.current]
      : [nextChapterCueRef.current, mobileNextChapterCueRef.current]
    const inactiveCues = direction < 0
      ? [nextChapterCueRef.current, mobileNextChapterCueRef.current]
      : [previousChapterCueRef.current, mobilePreviousChapterCueRef.current]
    const mobileActiveCue = direction < 0
      ? mobilePreviousChapterCueRef.current
      : mobileNextChapterCueRef.current
    const cueOffset = -signedPull * CHAPTER_CUE_PULL_FACTOR
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    activeCues.forEach((cue) => {
      if (cue) cue.style.opacity = `${cueProgress}`
    })
    inactiveCues.forEach((cue) => {
      cue?.style.removeProperty('opacity')
      cue?.style.removeProperty('transform')
      cue?.style.removeProperty('will-change')
    })
    if (mobileActiveCue && !prefersReducedMotion) {
      mobileActiveCue.style.willChange = 'transform, opacity'
      const mobileCueOffset = mobileChapterCueBaseOffsetRef.current + cueOffset
      mobileActiveCue.style.transform = `translate3d(-50%, ${mobileCueOffset}px, 0)`
    }

    if (motion && !prefersReducedMotion) {
      clearChapterMotionCleanup()
      motion.style.willChange = 'transform'
      motion.style.transition = 'none'
      motion.style.transform = `translate3d(0, ${-chapterOffset}px, 0)`
    }

    if (chapterPullIdleTimerRef.current !== null) {
      window.clearTimeout(chapterPullIdleTimerRef.current)
    }
    chapterPullIdleTimerRef.current = window.setTimeout(() => {
      chapterPullDistanceRef.current = 0
      chapterPullDirectionRef.current = 0
      chapterPullIdleTimerRef.current = null
      releaseChapterMotion()
    }, 360)

    if (chapterPullDistanceRef.current < pullThreshold) return

    chapterPullDistanceRef.current = 0
    chapterPullDirectionRef.current = 0
    if (chapterPullIdleTimerRef.current !== null) {
      window.clearTimeout(chapterPullIdleTimerRef.current)
      chapterPullIdleTimerRef.current = null
    }

    element.style.overflowY = 'hidden'

    if (prefersReducedMotion || !motion) {
      chapterTransitioningRef.current = true
      chapterTransitionDirectionRef.current = direction
      chapterTransitionMinimumEndRef.current = performance.now()
      moveToChapter(nextChapterIndex, 0)
      scheduleChapterWheelUnlock(
        direction < 0 ? CHAPTER_BACKWARD_WHEEL_QUIET_MS : CHAPTER_WHEEL_QUIET_MS,
      )
      return
    }

    chapterTransitioningRef.current = true
    chapterTransitionDirectionRef.current = direction
    chapterTransitionMinimumEndRef.current = performance.now()
      + CHAPTER_EXIT_DURATION
      + CHAPTER_ENTER_DURATION
      + 40
    if (chapterWheelUnlockTimerRef.current !== null) {
      window.clearTimeout(chapterWheelUnlockTimerRef.current)
      chapterWheelUnlockTimerRef.current = null
    }
    motion.style.willChange = 'transform, opacity'
    motion.style.transition = `transform ${CHAPTER_EXIT_DURATION}ms ${CHAPTER_MOTION_EASE}, opacity 160ms ease-out`
    motion.style.opacity = '0'
    motion.style.transform = `translate3d(0, ${-direction * pullThreshold}px, 0)`
    chapterTransitionTimerRef.current = window.setTimeout(() => {
      chapterTransitionTimerRef.current = null
      moveToChapter(nextChapterIndex, 0)
    }, CHAPTER_EXIT_DURATION)
  }

  const handleChapterWheel = (event: WheelEvent) => {
    handleChapterDelta(event.deltaY, () => event.preventDefault())
  }

  chapterWheelHandlerRef.current = handleChapterWheel
  chapterDeltaHandlerRef.current = handleChapterDelta

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => chapterWheelHandlerRef.current(event)
    let previousTouchY: number | null = null
    const handleTouchStart = (event: TouchEvent) => {
      previousTouchY = event.touches[0]?.clientY ?? null
    }
    const handleTouchMove = (event: TouchEvent) => {
      const nextTouchY = event.touches[0]?.clientY
      if (previousTouchY === null || nextTouchY === undefined) return
      const deltaY = previousTouchY - nextTouchY
      previousTouchY = nextTouchY
      chapterDeltaHandlerRef.current(deltaY, () => event.preventDefault())
    }
    const handleTouchEnd = () => {
      previousTouchY = null
    }
    const wideQuery = window.matchMedia('(min-width: 1280px)')
    const compactQuery = window.matchMedia('(min-width: 810px) and (max-width: 1279px)')
    let element: HTMLElement | null = null

    const bindScrollInput = () => {
      if (element) {
        element.removeEventListener('wheel', handleWheel)
        element.removeEventListener('touchstart', handleTouchStart)
        element.removeEventListener('touchmove', handleTouchMove)
        element.removeEventListener('touchend', handleTouchEnd)
        element.removeEventListener('touchcancel', handleTouchEnd)
      }

      element = getChapterScrollElement()
      element?.addEventListener('wheel', handleWheel, { passive: false })
      element?.addEventListener('touchstart', handleTouchStart, { passive: true })
      element?.addEventListener('touchmove', handleTouchMove, { passive: false })
      element?.addEventListener('touchend', handleTouchEnd, { passive: true })
      element?.addEventListener('touchcancel', handleTouchEnd, { passive: true })
    }

    bindScrollInput()
    wideQuery.addEventListener('change', bindScrollInput)
    compactQuery.addEventListener('change', bindScrollInput)

    return () => {
      wideQuery.removeEventListener('change', bindScrollInput)
      compactQuery.removeEventListener('change', bindScrollInput)
      if (!element) return
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [])

  const getPointerRatio = (clientX: number, clientY: number) => {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect) return null
    const horizontal = rect.width > rect.height

    return horizontal
      ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
  }

  const positionHoverPopover = (clientY: number) => {
    const rect = experienceRef.current?.getBoundingClientRect()
    if (!rect) return

    experienceRef.current?.style.setProperty(
      '--popover-y',
      `${clientY - rect.top}px`,
    )
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const ratio = getPointerRatio(event.clientX, event.clientY)
    if (ratio === null) return
    const rect = railRef.current?.getBoundingClientRect()
    const isHorizontal = rect ? rect.width > rect.height : false

    timelinePointerSessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRatio: ratio,
      isHorizontal,
      didDrag: false,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setIsTimelineDragging(true)
    positionHoverPopover(event.clientY)
    prepareHapticPosition(ratio)
    hoverProgressRef.current = ratio
    setHoverProgress(ratio)

    if (!isHorizontal) {
      hoverLockRef.current = true
      snapTo(ratio * lastIndex)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = railRef.current?.getBoundingClientRect()
    const isHorizontal = rect ? rect.width > rect.height : false
    const isDragging = event.currentTarget.hasPointerCapture(event.pointerId)
    const pointerSession = timelinePointerSessionRef.current
    const showsHoverPopover = window.matchMedia(
      '(min-width: 810px) and (max-width: 1279px)',
    ).matches

    if (isHorizontal && !isDragging) return
    if (!isHorizontal && hoverLockRef.current && !isDragging && !showsHoverPopover) return

    const ratio = getPointerRatio(event.clientX, event.clientY)
    if (ratio === null) return

    if (
      isDragging
      && pointerSession?.pointerId === event.pointerId
      && !pointerSession.didDrag
      && Math.hypot(
        event.clientX - pointerSession.startX,
        event.clientY - pointerSession.startY,
      ) >= TIMELINE_TAP_DRAG_THRESHOLD
    ) {
      pointerSession.didDrag = true
    }
    if (showsHoverPopover) {
      positionHoverPopover(event.clientY)
    }
    hoverProgressRef.current = ratio
    setHoverProgress(ratio)

    if (isDragging && (!isHorizontal || pointerSession?.didDrag)) {
      if (isHorizontal) {
        moveTo(ratio * lastIndex)
      } else {
        snapTo(ratio * lastIndex)
      }
      pulseHapticAt(ratio)
    }
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointerSession = timelinePointerSessionRef.current
    const isMobileTap = pointerSession?.pointerId === event.pointerId
      && pointerSession.isHorizontal
      && !pointerSession.didDrag
      && window.matchMedia('(max-width: 809px)').matches

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    timelinePointerSessionRef.current = null
    hoverProgressRef.current = null
    hapticTickRef.current = null
    setIsTimelineDragging(false)
    setHoverProgress(null)

    if (isMobileTap && pointerSession) {
      const timestamp = Math.round(
        BIRTH_TIMESTAMP
          + pointerSession.startRatio * (presentTimestamp - BIRTH_TIMESTAMP),
      )
      moveToChapter(getChapterIndex(timestamp), 0)
    }
  }

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    timelinePointerSessionRef.current = null
    hoverProgressRef.current = null
    hapticTickRef.current = null
    setIsTimelineDragging(false)
    setHoverProgress(null)
  }

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      hoverLockRef.current = false
      hoverProgressRef.current = null
      hapticTickRef.current = null
      setIsTimelineDragging(false)
      setHoverProgress(null)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, number> = {
      ArrowUp: -1,
      ArrowLeft: -1,
      ArrowDown: 1,
      ArrowRight: 1,
      PageUp: -5,
      PageDown: 5,
    }

    if (event.key in offsets) {
      event.preventDefault()
      const next = Math.round(targetRef.current) + offsets[event.key]
      moveTo(next)
      pulseHapticAt(Math.max(0, Math.min(1, next / lastIndex)))
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveTo(0)
      pulseHapticAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveTo(lastIndex)
      pulseHapticAt(1)
    }
  }

  const flushMetadataScrub = () => {
    const nextPosition = pendingMetadataPositionRef.current
    metadataScrubFrameRef.current = null
    pendingMetadataPositionRef.current = null
    if (nextPosition === null) return

    snapTo(nextPosition)
    pulseHapticAt(nextPosition / lastIndex)
  }

  const scheduleMetadataScrub = (nextPosition: number) => {
    setIsBeyondPresentPreview(false)
    pendingMetadataPositionRef.current = nextPosition
    if (metadataScrubFrameRef.current === null) {
      metadataScrubFrameRef.current = requestAnimationFrame(flushMetadataScrub)
    }
  }

  const scheduleAgePortraitPosition = (clientX: number) => {
    const anchorX = agePortraitAnchorXRef.current
    const anchorY = agePortraitAnchorYRef.current
    if (anchorX === null || anchorY === null) return

    pendingAgePortraitPositionRef.current = {
      x: anchorX,
      y: anchorY,
    }
    if (agePortraitFrameRef.current !== null) return

    agePortraitFrameRef.current = requestAnimationFrame(() => {
      const position = pendingAgePortraitPositionRef.current
      const portrait = agePortraitRef.current
      agePortraitFrameRef.current = null
      pendingAgePortraitPositionRef.current = null
      if (!position || !portrait) return

      portrait.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, calc(-100% - 10px))`
    })
  }

  const handleAgePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== 'mouse'
      || !window.matchMedia('(min-width: 1280px) and (hover: hover)').matches
    ) return

    const ageBounds = (ageValueRef.current ?? event.currentTarget).getBoundingClientRect()
    agePortraitAnchorXRef.current = ageBounds.left + ageBounds.width / 2
    agePortraitAnchorYRef.current = ageBounds.top
    scheduleAgePortraitPosition(event.clientX)
    setIsLocationGlobeVisible(false)
    setIsAgePortraitVisible(true)
  }

  const handleAgePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') {
      scheduleAgePortraitPosition(event.clientX)
    }
    handleMetadataPointerMove(event)
  }

  const handleAgePointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      setIsAgePortraitVisible(false)
    }
  }

  const handleMetadataPointerDown = (
    event: React.PointerEvent<HTMLElement>,
    source: MetadataScrubSource,
  ) => {
    if (event.button !== 0) return

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    const scrubStops = getMetadataScrubStops(source)
    const startTimestamp = Math.round(
      BIRTH_TIMESTAMP
        + (positionRef.current / lastIndex) * (presentTimestamp - BIRTH_TIMESTAMP),
    )

    metadataScrubSessionRef.current = {
      pointerId: event.pointerId,
      source,
      startX: event.clientX,
      startPosition: positionRef.current,
      startStopIndex: scrubStops
        ? getScrubStopIndex(scrubStops, startTimestamp)
        : null,
      didDrag: false,
    }
    setMetadataScrubSource(source)
    prepareHapticPosition(positionRef.current / lastIndex)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleMetadataPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const session = metadataScrubSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    const deltaX = event.clientX - session.startX
    if (!session.didDrag && Math.abs(deltaX) < METADATA_SCRUB_DRAG_THRESHOLD) return

    if (!session.didDrag) {
      session.didDrag = true
      if (session.source === 'date') {
        suppressDateClickRef.current = true
        setIsDateEditing(false)
      }
    }

    event.preventDefault()
    const scrubStops = getMetadataScrubStops(session.source)
    if (scrubStops && session.startStopIndex !== null) {
      const stopOffset = Math.round(deltaX / METADATA_SCRUB_PIXELS_PER_STOP)
      const stopIndex = Math.max(
        0,
        Math.min(scrubStops.length - 1, session.startStopIndex + stopOffset),
      )
      const stopPosition = ((scrubStops[stopIndex] - BIRTH_TIMESTAMP)
        / (presentTimestamp - BIRTH_TIMESTAMP)) * lastIndex
      scheduleMetadataScrub(stopPosition)
      return
    }

    const pixelsPerYear = session.source === 'age'
      ? AGE_SCRUB_PIXELS_PER_YEAR
      : METADATA_SCRUB_PIXELS_PER_YEAR
    const requestedPosition = session.startPosition + deltaX / pixelsPerYear
    if (session.source === 'age' && requestedPosition > lastIndex) {
      snapTo(lastIndex)
      pulseHapticAt(1)
      setIsBeyondPresentPreview(true)
      setIsAgePortraitVisible(true)
      return
    }

    scheduleMetadataScrub(Math.max(
      0,
      Math.min(
        lastIndex,
        requestedPosition,
      ),
    ))
  }

  const scheduleLocationGlobePosition = (clientX: number) => {
    const anchorX = locationGlobeAnchorXRef.current
    const anchorY = locationGlobeAnchorYRef.current
    if (anchorX === null || anchorY === null) return

    const rubberBandedX = anchorX
    locationGlobeLongitudeOffsetRef.current = Math.max(
      -LOCATION_GLOBE_MAX_LONGITUDE_OFFSET,
      Math.min(
        LOCATION_GLOBE_MAX_LONGITUDE_OFFSET,
        ((clientX - anchorX) / LOCATION_GLOBE_ROTATION_DISTANCE)
          * LOCATION_GLOBE_MAX_LONGITUDE_OFFSET,
      ),
    )
    pendingLocationGlobePositionRef.current = { x: rubberBandedX, y: anchorY }
    if (locationGlobeFrameRef.current !== null) return

    locationGlobeFrameRef.current = requestAnimationFrame(() => {
      const position = pendingLocationGlobePositionRef.current
      const globe = locationGlobeRef.current
      locationGlobeFrameRef.current = null
      pendingLocationGlobePositionRef.current = null
      if (!position || !globe) return

      globe.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, calc(-100% - 10px))`
    })
  }

  const handleLocationPointerEnter = (event: React.PointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== 'mouse'
      || !window.matchMedia('(min-width: 1280px) and (hover: hover)').matches
    ) return

    const locationBounds = event.currentTarget.getBoundingClientRect()
    locationGlobeAnchorXRef.current = locationBounds.left + locationBounds.width / 2
    locationGlobeAnchorYRef.current = locationBounds.top
    scheduleLocationGlobePosition(event.clientX)
    setIsAgePortraitVisible(false)
    setIsLocationGlobeVisible(true)
  }

  const handleLocationPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') {
      scheduleLocationGlobePosition(event.clientX)
    }
    handleMetadataPointerMove(event)
  }

  const handleLocationPointerLeave = (event: React.PointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      locationGlobeLongitudeOffsetRef.current = 0
      setIsLocationGlobeVisible(false)
    }
  }

  const finishMetadataScrub = () => {
    const session = metadataScrubSessionRef.current
    if (!session) return

    metadataScrubSessionRef.current = null
    setMetadataScrubSource(null)

    if (metadataScrubFrameRef.current !== null) {
      cancelAnimationFrame(metadataScrubFrameRef.current)
      flushMetadataScrub()
    }
    if (session.didDrag && session.source === 'date') {
      if (suppressDateClickTimerRef.current !== null) {
        window.clearTimeout(suppressDateClickTimerRef.current)
      }
      suppressDateClickTimerRef.current = window.setTimeout(() => {
        suppressDateClickRef.current = false
        suppressDateClickTimerRef.current = null
      }, 0)
    }

    hapticTickRef.current = null
  }

  const endMetadataScrub = (event: React.PointerEvent<HTMLElement>) => {
    const session = metadataScrubSessionRef.current
    if (!session || session.pointerId !== event.pointerId) return

    finishMetadataScrub()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleMetadataKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    step: number,
  ) => {
    const offsets: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -step * 5,
      PageUp: step * 5,
    }

    if (event.key in offsets) {
      event.preventDefault()
      snapTo(targetRef.current + offsets[event.key])
    } else if (event.key === 'Home') {
      event.preventDefault()
      snapTo(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      snapTo(lastIndex)
    }
  }

  const handleDiscreteMetadataKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    source: MetadataScrubSource,
  ) => {
    const scrubStops = getMetadataScrubStops(source)
    if (!scrubStops) return

    const timestamp = Math.round(
      BIRTH_TIMESTAMP
        + (positionRef.current / lastIndex) * (presentTimestamp - BIRTH_TIMESTAMP),
    )
    const currentIndex = getScrubStopIndex(scrubStops, timestamp)
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown'
      ? -1
      : event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? 1
        : event.key === 'Home'
          ? -currentIndex
          : event.key === 'End'
            ? scrubStops.length - 1 - currentIndex
            : null
    if (direction === null) return

    event.preventDefault()
    const stopIndex = Math.max(0, Math.min(scrubStops.length - 1, currentIndex + direction))
    const stopPosition = ((scrubStops[stopIndex] - BIRTH_TIMESTAMP)
      / (presentTimestamp - BIRTH_TIMESTAMP)) * lastIndex
    snapTo(stopPosition)
  }

  const handleMetadataWheel = (
    event: React.WheelEvent<HTMLElement>,
    source: MetadataWheelSource,
  ) => {
    const horizontalDelta = -(event.deltaMode === 1
      ? event.deltaX * 16
      : event.deltaMode === 2
        ? event.deltaX * window.innerWidth
        : event.deltaX)
    const verticalDelta = event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * window.innerHeight
        : event.deltaY

    if (Math.abs(horizontalDelta) < 1 || Math.abs(horizontalDelta) <= Math.abs(verticalDelta)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    const session = metadataWheelSessionRef.current
    if (session.source !== source) {
      session.source = source
      session.accumulatedDelta = 0
      session.position = positionRef.current
      prepareHapticPosition(positionRef.current / lastIndex)
    }

    const scrubStops = getMetadataScrubStops(source)
    if (scrubStops) {
      session.accumulatedDelta += horizontalDelta
      const stopOffset = Math.trunc(
        session.accumulatedDelta / METADATA_SCRUB_PIXELS_PER_STOP,
      )
      if (stopOffset !== 0) {
        const timestamp = Math.round(
          BIRTH_TIMESTAMP
            + (session.position / lastIndex) * (presentTimestamp - BIRTH_TIMESTAMP),
        )
        const currentIndex = getScrubStopIndex(scrubStops, timestamp)
        const stopIndex = Math.max(
          0,
          Math.min(scrubStops.length - 1, currentIndex + stopOffset),
        )
        session.position = ((scrubStops[stopIndex] - BIRTH_TIMESTAMP)
          / (presentTimestamp - BIRTH_TIMESTAMP)) * lastIndex
        session.accumulatedDelta -= stopOffset * METADATA_SCRUB_PIXELS_PER_STOP
        scheduleMetadataScrub(session.position)
      }
    } else {
      const requestedPosition = session.position
        + horizontalDelta / AGE_SCRUB_PIXELS_PER_YEAR

      if (requestedPosition > lastIndex) {
        session.position = lastIndex
        snapTo(lastIndex)
        pulseHapticAt(1)
        setIsBeyondPresentPreview(true)
        setIsAgePortraitVisible(true)
      } else {
        session.position = Math.max(0, Math.min(lastIndex, requestedPosition))
        scheduleMetadataScrub(session.position)
      }
    }

    if (metadataWheelResetTimerRef.current !== null) {
      window.clearTimeout(metadataWheelResetTimerRef.current)
    }
    metadataWheelResetTimerRef.current = window.setTimeout(() => {
      metadataWheelSessionRef.current = {
        source: null,
        accumulatedDelta: 0,
        position: positionRef.current,
      }
      metadataWheelResetTimerRef.current = null
      hapticTickRef.current = null
    }, 180)
  }

  useEffect(() => {
    if (metadataScrubSource === null) return

    const handleWindowPointerEnd = () => finishMetadataScrub()
    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
    }
  }, [metadataScrubSource])

  return (
    <section
      ref={experienceRef}
      className={styles.experience}
      style={{
        '--timeline-progress': progress,
        '--timeline-percent': `${progress * 100}%`,
        '--pill-percent': `${pillProgress * 100}%`,
        '--compact-timeline-height': `${CHAPTER_STARTS.length * 10 + 1}px`,
      } as React.CSSProperties}
      aria-label="Gabriel Valdivia life timeline"
    >
      <aside className={styles.timelineShell} aria-label="Life timeline">
        <div
          ref={railRef}
          className={styles.timelineRail}
          role="slider"
          tabIndex={0}
          aria-label="Timeline — scrub through Gabriel’s life"
          aria-orientation="vertical"
          aria-valuemin={BIRTH_YEAR}
          aria-valuemax={presentYear}
          aria-valuenow={contentYear}
          aria-valuetext={`${contentDateLabel}. Age ${contentAgeLabel}. Location: ${locationDetails}.${educationDetails !== '—' ? ` Education: ${educationDetails}.` : ''}${workDetails !== '—' ? ` Work: ${workDetails}.` : ''}`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
        >
          <div className={styles.ticks} aria-hidden="true">
            {railTicks.map((tick) => {
              const distance = hoverProgress === null ? 1 : Math.abs(tick.position - pillProgress)
              const radius = 0.05
              const influence = distance >= radius
                ? 0
                : Math.cos((distance / radius) * (Math.PI / 2)) ** 2
              const baseWidth = tick.isChapter ? 14 : 6
              const baseOpacity = tick.isChapter ? 0.72 : 0.28
              const tickLength = baseWidth + influence * 14
              const activeCompactIndex = Math.round(pillProgress * CHAPTER_STARTS.length)
              const compactDistance = hoverProgress === null || tick.compactIndex === null
                ? Number.POSITIVE_INFINITY
                : Math.abs(tick.compactIndex - activeCompactIndex)
              const compactLength = compactDistance === 0
                ? 28
                : compactDistance === 1
                  ? 16
                  : compactDistance === 2
                    ? 10
                    : compactDistance === 3
                      ? 8
                      : 6
              const compactOpacity = compactDistance === 0
                ? 1
                : compactDistance === 1
                  ? 0.62
                  : compactDistance === 2
                    ? 0.42
                    : 0.28

              return (
                <span
                  key={tick.id}
                  className={styles.tick}
                  data-chapter={tick.isChapter ? 'true' : 'false'}
                  style={{
                    '--tick-position': `${tick.position * 100}%`,
                    '--tick-compact-position': tick.compactIndex === null
                      ? '0px'
                      : `${tick.compactIndex * 10}px`,
                    '--tick-length': `${tickLength}px`,
                    '--tick-mobile-length': `${tickLength}px`,
                    '--tick-compact-length': `${compactLength}px`,
                    '--tick-compact-opacity': compactOpacity,
                    top: `${tick.position * 100}%`,
                    width: `${tickLength}px`,
                    opacity: baseOpacity + influence * (1 - baseOpacity),
                  } as React.CSSProperties}
                />
              )
            })}
          </div>

          <span
            className={styles.activeTick}
            style={{
              '--active-tick-position': `${pillProgress * 100}%`,
              top: `${pillProgress * 100}%`,
            } as React.CSSProperties}
            aria-hidden="true"
          />

          <span
            className={`${styles.activeDate} ${hoverProgress === null ? styles.restingDate : ''}`}
            style={{ top: `${pillProgress * 100}%` }}
            aria-hidden="true"
          >
            {isBeyondPresentPreview ? '??' : pillLabel}
          </span>
        </div>
      </aside>

      <div
        ref={stageRef}
        className={styles.stage}
        aria-live="polite"
        aria-atomic="true"
        onScroll={handleChapterScroll}
      >
        <article ref={storyRef} className={styles.story} onScroll={handleChapterScroll}>
          <div
            ref={chapterScrollRef}
            className={styles.chapterHeader}
            onScroll={handleChapterScroll}
          >
            <div ref={chapterMotionRef} className={styles.chapterMotion}>
              <div className={styles.chapterContent}>
                {contentChapterIndex > 0 && (
                  <div
                    ref={previousChapterCueRef}
                    className={`${styles.chapterBoundaryCue} ${styles.previousChapterCue}`}
                    aria-hidden="true"
                  >
                    Back to {previousChapterLabel}
                  </div>
                )}
                <div className={styles.chapterEyebrow}>
                  <span className={styles.chapterEyebrowLabel}>
                    <span>{contentChapterLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{contentChapterRangeLabel}</span>
                  </span>
                  <button
                    type="button"
                    aria-label="Previous chapter"
                    disabled={contentChapterIndex === 0}
                    onClick={() => moveToChapter(contentChapterIndex - 1)}
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next chapter"
                    disabled={contentChapterIndex === CHAPTER_BOUNDARIES.length - 1}
                    onClick={() => moveToChapter(contentChapterIndex + 1)}
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
                <h1>{contentTitle}</h1>
                <div
                  ref={chapterDescriptionRef}
                  className={styles.chapterDescription}
                >
                  <RichText data={contentRichText} />
                </div>
                {contentChapterIndex < CHAPTER_BOUNDARIES.length - 1 && (
                  <div
                    ref={nextChapterCueRef}
                    className={`${styles.chapterBoundaryCue} ${styles.nextChapterCue}`}
                    aria-hidden="true"
                  >
                    Continue to {nextChapterLabel}
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className={styles.detailsColumn}>
            <div className={styles.metaGrid}>
              <div className={styles.eyebrow}>
                <span className={styles.contextHeading}>Date</span>
                <Popover
                  open={isDateEditing}
                  onOpenChange={setIsDateEditing}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={styles.dateButton}
                      aria-label={`Date: ${isBeyondPresentPreview ? 'unknown' : contentDateLabel}. Drag horizontally to scrub, or click to open the calendar.`}
                      onClickCapture={(event) => {
                        if (!suppressDateClickRef.current) return
                        event.preventDefault()
                        event.stopPropagation()
                        suppressDateClickRef.current = false
                      }}
                      onKeyDown={(event) => handleMetadataKeyDown(event, 1 / 12)}
                      onPointerDown={(event) => handleMetadataPointerDown(event, 'date')}
                      onPointerMove={handleMetadataPointerMove}
                      onPointerUp={endMetadataScrub}
                      onPointerCancel={endMetadataScrub}
                      onLostPointerCapture={endMetadataScrub}
                    >
                      {isBeyondPresentPreview ? (
                        <span className={styles.unknownDate}>??</span>
                      ) : (
                        <>
                          <time dateTime={contentDateTime}>{contentDateLabel}</time>
                          <HugeiconsIcon
                            className={styles.dateCalendarIcon}
                            icon={Calendar04Icon}
                            size={20}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={styles.datePopoverContent}
                    align="start"
                    sideOffset={8}
                    onOpenAutoFocus={(event) => {
                      event.preventDefault()
                    }}
                  >
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      defaultMonth={new Date(
                        contentDate.getUTCFullYear(),
                        contentDate.getUTCMonth(),
                        1,
                      )}
                      selected={new Date(
                        contentDate.getUTCFullYear(),
                        contentDate.getUTCMonth(),
                        contentDate.getUTCDate(),
                      )}
                      startMonth={new Date(1987, 2, 1)}
                      endMonth={new Date(presentYear, presentMonth - 1, 1)}
                      disabled={{
                        before: new Date(1987, 2, 23),
                        after: new Date(presentYear, presentMonth - 1, presentDay),
                      }}
                      onSelect={(date) => {
                        if (!date) return
                        const selectedDate = [
                          date.getFullYear(),
                          String(date.getMonth() + 1).padStart(2, '0'),
                          String(date.getDate()).padStart(2, '0'),
                        ].join('-')
                        navigateToDate(selectedDate)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <dl className={styles.details}>
                <div className={styles.ageDetail}>
                  <dt>Age</dt>
                  <dd>
                    <span
                      className={`${styles.metadataScrubber} ${styles.ageScrubber}`}
                      role="slider"
                      tabIndex={0}
                      aria-label="Age"
                      aria-valuemin={0}
                      aria-valuemax={presentYear - BIRTH_YEAR}
                      aria-valuenow={contentAge}
                      aria-valuetext={isBeyondPresentPreview ? 'Beyond the present' : String(contentAgeLabel)}
                      onKeyDown={(event) => handleMetadataKeyDown(event, 1)}
                      onPointerEnter={handleAgePointerEnter}
                      onWheel={(event) => handleMetadataWheel(event, 'age')}
                      onPointerDown={(event) => handleMetadataPointerDown(event, 'age')}
                      onPointerMove={handleAgePointerMove}
                      onPointerUp={(event) => {
                        endMetadataScrub(event)
                        if (!event.currentTarget.matches(':hover')) {
                          setIsAgePortraitVisible(false)
                        }
                      }}
                      onPointerLeave={handleAgePointerLeave}
                      onPointerCancel={(event) => {
                        endMetadataScrub(event)
                        setIsAgePortraitVisible(false)
                      }}
                      onLostPointerCapture={(event) => {
                        endMetadataScrub(event)
                        if (!event.currentTarget.matches(':hover')) {
                          setIsAgePortraitVisible(false)
                        }
                      }}
                    >
                      <span ref={ageValueRef}>
                        {isBeyondPresentPreview ? '??' : contentAgeLabel}
                      </span>
                    </span>
                  </dd>
                </div>
                <div className={styles.whereDetail}>
                  <dt>Location</dt>
                  <dd>
                    <span
                      className={styles.metadataScrubber}
                      role="slider"
                      tabIndex={0}
                      aria-label="Location"
                      aria-valuemin={BIRTH_TIMESTAMP}
                      aria-valuemax={presentTimestamp}
                      aria-valuenow={contentTimestamp}
                      aria-valuetext={isBeyondPresentPreview ? 'Unknown' : `${locationDetails}, ${contentDateLabel}`}
                      onKeyDown={(event) => handleDiscreteMetadataKeyDown(event, 'location')}
                      onPointerEnter={handleLocationPointerEnter}
                      onWheel={(event) => handleMetadataWheel(event, 'location')}
                      onPointerDown={(event) => handleMetadataPointerDown(event, 'location')}
                      onPointerMove={handleLocationPointerMove}
                      onPointerUp={(event) => {
                        endMetadataScrub(event)
                        if (!event.currentTarget.matches(':hover')) {
                          locationGlobeLongitudeOffsetRef.current = 0
                          setIsLocationGlobeVisible(false)
                        }
                      }}
                      onPointerLeave={handleLocationPointerLeave}
                      onPointerCancel={(event) => {
                        endMetadataScrub(event)
                        locationGlobeLongitudeOffsetRef.current = 0
                        setIsLocationGlobeVisible(false)
                      }}
                      onLostPointerCapture={(event) => {
                        endMetadataScrub(event)
                        if (!event.currentTarget.matches(':hover')) {
                          locationGlobeLongitudeOffsetRef.current = 0
                          setIsLocationGlobeVisible(false)
                        }
                      }}
                    >
                      {isBeyondPresentPreview ? '??' : locationDetails}
                    </span>
                  </dd>
                </div>
                {(educationDetails !== '—' || metadataScrubSource === 'education') && (
                  <div className={styles.educationDetail}>
                    <dt>Education</dt>
                    <dd>
                      <span
                        className={styles.metadataScrubber}
                        role="slider"
                        tabIndex={0}
                        aria-label="Education"
                        aria-valuemin={BIRTH_TIMESTAMP}
                        aria-valuemax={presentTimestamp}
                        aria-valuenow={contentTimestamp}
                        aria-valuetext={`${educationDetails}, ${contentDateLabel}`}
                        onKeyDown={(event) => handleDiscreteMetadataKeyDown(event, 'education')}
                        onPointerDown={(event) => handleMetadataPointerDown(event, 'education')}
                        onPointerMove={handleMetadataPointerMove}
                        onPointerUp={endMetadataScrub}
                        onPointerCancel={endMetadataScrub}
                        onLostPointerCapture={endMetadataScrub}
                      >
                        {educationDetails}
                      </span>
                    </dd>
                  </div>
                )}
                {(workDetails !== '—' || metadataScrubSource === 'work') && (
                  <div className={styles.workDetail}>
                    <dt>Work</dt>
                    <dd>
                      <span
                        className={styles.metadataScrubber}
                        role="slider"
                        tabIndex={0}
                        aria-label="Work"
                        aria-valuemin={BIRTH_TIMESTAMP}
                        aria-valuemax={presentTimestamp}
                        aria-valuenow={contentTimestamp}
                        aria-valuetext={isBeyondPresentPreview ? 'Unknown' : `${workDetails}, ${contentDateLabel}`}
                        onKeyDown={(event) => handleDiscreteMetadataKeyDown(event, 'work')}
                        onPointerDown={(event) => handleMetadataPointerDown(event, 'work')}
                        onPointerMove={handleMetadataPointerMove}
                        onPointerUp={endMetadataScrub}
                        onPointerCancel={endMetadataScrub}
                        onLostPointerCapture={endMetadataScrub}
                      >
                        {isBeyondPresentPreview ? '??' : workDetails}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            {!isBeyondPresentPreview && (
              <div className={styles.newsBlock}>
                <span className={styles.contextHeading}>News</span>
                <p className={styles.note}>
                  {worldContext ? (
                    <a
                      className={styles.newsLink}
                      href={worldContext.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={styles.newsLinkText}>{worldContext.summary}</span>
                      <HoverArrow
                        className={styles.newsLinkIcon}
                      />
                    </a>
                  ) : 'The story of this year is still being written.'}
                </p>
              </div>
            )}
          </aside>
        </article>
      </div>

      {contentChapterIndex > 0 && (
        <div
          key={`mobile-previous-${contentChapterIndex}`}
          ref={mobilePreviousChapterCueRef}
          className={`${styles.mobileChapterBoundaryCue} ${styles.mobilePreviousChapterCue}`}
          aria-hidden="true"
        >
          Back to {previousChapterLabel}
        </div>
      )}
      {contentChapterIndex < CHAPTER_BOUNDARIES.length - 1 && (
        <div
          key={`mobile-next-${contentChapterIndex}`}
          ref={mobileNextChapterCueRef}
          className={`${styles.mobileChapterBoundaryCue} ${styles.mobileNextChapterCue}`}
          aria-hidden="true"
        >
          Continue to {nextChapterLabel}
        </div>
      )}

      {(isTimelineDragging || hoverProgress !== null) && (
        <aside className={styles.mobileSidebarPopover} aria-label="Timeline details">
          <dl className={styles.mobileSidebarGrid}>
            <div>
              <dt>Date</dt>
              <dd>
                <time dateTime={previewDateTime}>{previewDateLabel}</time>
              </dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{previewAgeLabel}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{previewLocationDetails}</dd>
            </div>
            {previewEducationDetails !== '—' && (
              <div>
                <dt>Education</dt>
                <dd>{previewEducationDetails}</dd>
              </div>
            )}
            {previewWorkDetails !== '—' && (
              <div>
                <dt>Work</dt>
                <dd>{previewWorkDetails}</dd>
              </div>
            )}
            {!isBeyondPresentPreview && (
              <div className={styles.mobileNews}>
                <dt>News</dt>
                <dd>
                  {previewWorldContext ? (
                    <a
                      className={styles.newsLink}
                      href={previewWorldContext.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={styles.newsLinkText}>{previewWorldContext.summary}</span>
                      <HoverArrow
                        className={styles.newsLinkIcon}
                      />
                    </a>
                  ) : 'The story of this year is still being written.'}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      )}

      {locationGlobePortalRoot && createPortal(
        <div
          ref={agePortraitRef}
          className={styles.ageCursorPortrait}
          data-visible={isAgePortraitVisible}
          data-beyond-present={isBeyondPresentPreview}
          aria-hidden="true"
        >
          {isBeyondPresentPreview ? (
            <img
              className={styles.ageCursorSkeleton}
              src="/timeline-faces/skeleton.webp"
              alt=""
            />
          ) : (
            <img src={contentAgePortrait} alt="" />
          )}
        </div>,
        locationGlobePortalRoot,
      )}

      {locationGlobePortalRoot && createPortal(
        <div
          ref={locationGlobeRef}
          className={styles.locationCursorGlobe}
          data-visible={isLocationGlobeVisible}
          aria-hidden="true"
        >
          <TimelineCursorGlobe
            active={isLocationGlobeVisible}
            location={locationGlobe}
            longitudeOffsetRef={locationGlobeLongitudeOffsetRef}
          />
        </div>,
        locationGlobePortalRoot,
      )}
    </section>
  )
}

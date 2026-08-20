'use client'

import { Calendar04Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_TIMELINE_CHAPTERS,
  type TimelineChapter,
} from '../data/timelineContent'
import { LOCATION_CONTEXT } from '../data/timelineWorldContext'
import { HoverArrow } from './Icons'
import { RichText } from './RichText'
import { Calendar } from './ui/Calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/Popover'
import styles from './TimelineExperience.module.css'

const BIRTH_YEAR = 1987
const PRESENT_YEAR = 2026
const BIRTH_TIMESTAMP = Date.UTC(1987, 2, 23)
const PRESENT_TIMESTAMP = Date.UTC(2026, 7, 19)
const TICKS_PER_YEAR = 1
const CHAPTER_PULL_THRESHOLD = 80
const MOBILE_CHAPTER_PULL_THRESHOLD = 200
const MOBILE_PREVIOUS_CHAPTER_CUE_DELAY = 100
const MOBILE_CHAPTER_CUE_FADE_PORTION = 0.75
const CHAPTER_PULL_MAX_OFFSET = 52
const CHAPTER_PULL_DAMPING = 140
const CHAPTER_CUE_PULL_FACTOR = 0.5
const CHAPTER_MOTION_EASE = 'cubic-bezier(0.22, 0.61, 0.24, 1)'
const CHAPTER_WHEEL_QUIET_MS = 80
const CHAPTER_BACKWARD_WHEEL_QUIET_MS = 220
const CHAPTER_EXIT_DURATION = 200
const CHAPTER_ENTER_DURATION = 420
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
}

const monthStart = (year: number, month: number) => Date.UTC(year, month - 1, 1)

const LOCATION_HISTORY: TimelinePeriod[] = [
  { startYear: 1987, endYear: 1994, label: 'Cuba' },
  { startYear: 1995, endYear: 2002, label: 'Costa Rica' },
  { startYear: 2003, endYear: 2011, label: 'Tampa' },
  { startYear: 2012, endYear: 2012, label: 'Los Angeles' },
  { startYear: 2013, endYear: 2014, label: 'San Francisco' },
  { startYear: 2015, endYear: 2015, label: 'London, England' },
  { startYear: 2016, endYear: 2017, label: 'San Francisco' },
  { startYear: 2018, endYear: PRESENT_YEAR, label: 'New York City' },
]

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
  { start: monthStart(2023, 9), end: PRESENT_TIMESTAMP + 1, label: 'Valdivia Works' },
]

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
const YEAR_TICKS = Array.from(
  { length: (PRESENT_YEAR - BIRTH_YEAR) * TICKS_PER_YEAR + 1 },
  (_, index) => ({
    id: index === 0 ? 'prologue' : `year-${BIRTH_YEAR + index}`,
    position: index / ((PRESENT_YEAR - BIRTH_YEAR) * TICKS_PER_YEAR),
    year: BIRTH_YEAR + index,
    isChapter: index === 0,
    compactIndex: index === 0 ? 0 : null,
  }),
).filter(({ year }) => !CHAPTER_YEARS.has(year))
const CHAPTER_TICKS = CHAPTER_STARTS.map((timestamp, index) => ({
  id: `chapter-${index + 1}`,
  position: (timestamp - BIRTH_TIMESTAMP) / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
  year: new Date(timestamp).getUTCFullYear(),
  isChapter: true,
  compactIndex: index + 1,
}))
const RAIL_TICKS = [...YEAR_TICKS, ...CHAPTER_TICKS]
  .sort((a, b) => a.position - b.position)

const getNearestTickIndex = (position: number) => {
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  RAIL_TICKS.forEach((tick, index) => {
    const distance = Math.abs(tick.position - position)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  return nearestIndex
}

export function TimelineExperience({
  chapters = DEFAULT_TIMELINE_CHAPTERS,
}: {
  chapters?: readonly TimelineChapter[]
}) {
  const lastIndex = PRESENT_YEAR - BIRTH_YEAR
  const [displayPosition, setDisplayPosition] = useState(lastIndex)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const [isTimelineDragging, setIsTimelineDragging] = useState(false)
  const [isDateEditing, setIsDateEditing] = useState(false)
  const [dateDraft, setDateDraft] = useState('')
  const hoverProgressRef = useRef<number | null>(null)
  const targetRef = useRef(lastIndex)
  const positionRef = useRef(lastIndex)
  const animationRef = useRef<number | null>(null)
  const experienceRef = useRef<HTMLElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const storyRef = useRef<HTMLElement | null>(null)
  const chapterScrollRef = useRef<HTMLDivElement | null>(null)
  const chapterMotionRef = useRef<HTMLDivElement | null>(null)
  const chapterDescriptionRef = useRef<HTMLDivElement | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
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
  }, [])

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
    const crossedChapter = RAIL_TICKS
      .slice(firstCrossedIndex, lastCrossedIndex + 1)
      .some((tick) => tick.isChapter)

    hapticTickRef.current = nextTickIndex
    navigator.vibrate?.(crossedChapter ? 12 : 5)
  }, [])

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
    targetRef.current = Math.max(0, Math.min(lastIndex, next))

    if (animationRef.current === null) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [animate, lastIndex])

  const snapTo = useCallback((next: number) => {
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
    }
  }, [])

  const progress = displayPosition / lastIndex
  const pillProgress = hoverProgress ?? progress
  const contentTimestamp = Math.round(
    BIRTH_TIMESTAMP + progress * (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
  )
  const contentDate = new Date(contentTimestamp)
  const contentYear = contentDate.getUTCFullYear()
  const isBeforeBirthday = contentDate.getUTCMonth() < 2
    || (contentDate.getUTCMonth() === 2 && contentDate.getUTCDate() < 23)
  const contentAge = contentYear - BIRTH_YEAR - (isBeforeBirthday ? 1 : 0)
  const contentAgeLabel = contentAge === 0 ? 'Newborn' : contentAge
  const contentDateLabel = FULL_DATE_FORMATTER.format(contentDate)
  const contentDateTime = contentDate.toISOString().slice(0, 10)
  const pillTimestamp = Math.round(
    BIRTH_TIMESTAMP + pillProgress * (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
  )
  const pillLabel = PILL_DATE_FORMATTER.format(new Date(pillTimestamp))
  const locationDetails = getPeriodLabel(LOCATION_HISTORY, contentYear)
  const educationDetails = getPeriodLabel(EDUCATION_HISTORY, contentYear)
  const workDetails = getDatedPeriodLabel(WORK_HISTORY, contentDate.getTime())
  const contentChapterIndex = getChapterIndex(contentDate.getTime())
  const contentChapterLabel = contentChapterIndex === 0
    ? 'Prologue'
    : `Chapter ${contentChapterIndex} of ${CHAPTER_BOUNDARIES.length}`
  const contentChapterRangeLabel = getChapterRangeLabel(contentChapterIndex)
  const contentTitle = chapters[contentChapterIndex].title
  const contentRichText = chapters[contentChapterIndex].content
  const worldContext = LOCATION_CONTEXT?.[locationDetails]?.[contentYear]
  const worldContextWikipediaHref = worldContext
    ? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(worldContext.summary)}`
    : null
  const previousChapterLabel = contentChapterIndex === 1
    ? 'Prologue'
    : `Chapter ${contentChapterIndex - 1}`
  const nextChapterLabel = `Chapter ${contentChapterIndex + 1}`

  const getChapterTimestampRange = (chapterIndex: number) => {
    const start = CHAPTER_BOUNDARIES[chapterIndex]
    const boundaryEnd = CHAPTER_BOUNDARIES[chapterIndex + 1] ?? PRESENT_TIMESTAMP
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
        + (positionRef.current / lastIndex) * (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP),
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
      / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP)

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

  const cancelDateEdit = () => {
    setIsDateEditing(false)
    setDateDraft('')
  }

  const navigateToDate = (dateValue = dateDraft) => {
    const [year, month, day] = dateValue.split('-').map(Number)
    if (!year || !month || !day) {
      cancelDateEdit()
      return
    }

    const requestedTimestamp = Date.UTC(year, month - 1, day)
    if (new Date(requestedTimestamp).toISOString().slice(0, 10) !== dateValue) {
      cancelDateEdit()
      return
    }

    const timestamp = Math.max(
      BIRTH_TIMESTAMP,
      Math.min(PRESENT_TIMESTAMP, requestedTimestamp),
    )
    const nextChapterIndex = getChapterIndex(timestamp)
    const { start, end } = getChapterTimestampRange(nextChapterIndex)
    const scrollRatio = end === start
      ? 0
      : Math.max(0, Math.min(1, (timestamp - start) / (end - start)))
    const nextProgress = (timestamp - BIRTH_TIMESTAMP)
      / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP)

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
    setDateDraft('')
    hoverProgressRef.current = null
    setHoverProgress(null)
    moveTo(nextProgress * lastIndex)
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
      Math.min(PRESENT_TIMESTAMP, requestedTimestamp),
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
      / (PRESENT_TIMESTAMP - BIRTH_TIMESTAMP)) * lastIndex

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

    chapterPullDistanceRef.current += Math.abs(deltaY)
    const pullThreshold = isMobile
      ? MOBILE_CHAPTER_PULL_THRESHOLD
      : CHAPTER_PULL_THRESHOLD
    const cueDelay = isMobile && direction < 0
      ? MOBILE_PREVIOUS_CHAPTER_CUE_DELAY
      : 0
    const cueFadeDistance = isMobile
      ? (pullThreshold - cueDelay) * MOBILE_CHAPTER_CUE_FADE_PORTION
      : pullThreshold - cueDelay
    const cueProgress = Math.max(0, Math.min(
      1,
      (chapterPullDistanceRef.current - cueDelay) / cueFadeDistance,
    ))
    const signedPull = chapterPullDistanceRef.current * direction
    const chapterOffset = isMobile
      ? Math.sign(signedPull) * Math.min(Math.abs(signedPull), pullThreshold)
      : CHAPTER_PULL_MAX_OFFSET
        * Math.sign(signedPull)
        * (1 - Math.exp(-Math.abs(signedPull) / CHAPTER_PULL_DAMPING))
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
      motion.style.transition = isMobile ? 'none' : 'transform 80ms linear'
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
    }, isMobile ? 360 : 260)

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
    motion.style.transform = `translate3d(0, ${-direction * (isMobile ? pullThreshold : 64)}px, 0)`
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
    const ratio = getPointerRatio(event.clientX, event.clientY)
    if (ratio === null) return
    const rect = railRef.current?.getBoundingClientRect()
    const isHorizontal = rect ? rect.width > rect.height : false

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
    const showsHoverPopover = window.matchMedia(
      '(min-width: 810px) and (max-width: 1279px)',
    ).matches

    if (isHorizontal && !isDragging) return
    if (!isHorizontal && hoverLockRef.current && !isDragging && !showsHoverPopover) return

    const ratio = getPointerRatio(event.clientX, event.clientY)
    if (ratio === null) return
    if (showsHoverPopover) {
      positionHoverPopover(event.clientY)
    }
    hoverProgressRef.current = ratio
    setHoverProgress(ratio)

    if (showsHoverPopover) {
      snapTo(ratio * lastIndex)
    } else if (isDragging) {
      if (isHorizontal) {
        moveTo(ratio * lastIndex)
      } else {
        snapTo(ratio * lastIndex)
      }
      pulseHapticAt(ratio)
    }
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
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
          aria-valuemax={PRESENT_YEAR}
          aria-valuenow={contentYear}
          aria-valuetext={`${contentDateLabel}. Age ${contentAgeLabel}. Location: ${locationDetails}.${educationDetails !== '—' ? ` Education: ${educationDetails}.` : ''}${workDetails !== '—' ? ` Work: ${workDetails}.` : ''}`}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerLeave}
        >
          <div className={styles.ticks} aria-hidden="true">
            {RAIL_TICKS.map((tick) => {
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
            {pillLabel}
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
                  onOpenChange={(open) => {
                    setIsDateEditing(open)
                    setDateDraft(open ? contentDateTime : '')
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={styles.dateButton}
                      aria-label={`Change date. Current date: ${contentDateLabel}`}
                    >
                      <time dateTime={contentDateTime}>{contentDateLabel}</time>
                      <HugeiconsIcon
                        className={styles.dateCalendarIcon}
                        icon={Calendar04Icon}
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={styles.datePopoverContent}
                    align="start"
                    sideOffset={8}
                    onOpenAutoFocus={(event) => {
                      event.preventDefault()
                      dateInputRef.current?.focus()
                    }}
                  >
                    <div className={styles.dateEditor}>
                    <input
                      ref={dateInputRef}
                      className={styles.dateInput}
                      type="text"
                      inputMode="numeric"
                      value={dateDraft}
                      aria-label="Go to date"
                      placeholder="YYYY-MM-DD"
                      onChange={(event) => setDateDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          navigateToDate()
                        } else if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelDateEdit()
                        }
                      }}
                    />
                      <HugeiconsIcon
                        className={styles.dateEditorIcon}
                        icon={Calendar04Icon}
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </div>
                    <Calendar
                      mode="single"
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
                      endMonth={new Date(2026, 7, 1)}
                      disabled={{
                        before: new Date(1987, 2, 23),
                        after: new Date(2026, 7, 19),
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
                  <dd>{contentAgeLabel}</dd>
                </div>
                <div className={styles.whereDetail}>
                  <dt>Location</dt>
                  <dd>{locationDetails}</dd>
                </div>
                {educationDetails !== '—' && (
                  <div className={styles.educationDetail}>
                    <dt>Education</dt>
                    <dd>{educationDetails}</dd>
                  </div>
                )}
                {workDetails !== '—' && (
                  <div className={styles.workDetail}>
                    <dt>Work</dt>
                    <dd>{workDetails}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className={styles.newsBlock}>
              <span className={styles.contextHeading}>News</span>
              <p className={styles.note}>
                {worldContext && worldContextWikipediaHref ? (
                  <a
                    className={styles.newsLink}
                    href={worldContextWikipediaHref}
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
                <time dateTime={contentDateTime}>{contentDateLabel}</time>
              </dd>
            </div>
            <div>
              <dt>Age</dt>
              <dd>{contentAgeLabel}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{locationDetails}</dd>
            </div>
            {educationDetails !== '—' && (
              <div>
                <dt>Education</dt>
                <dd>{educationDetails}</dd>
              </div>
            )}
            {workDetails !== '—' && (
              <div>
                <dt>Work</dt>
                <dd>{workDetails}</dd>
              </div>
            )}
            <div className={styles.mobileNews}>
              <dt>News</dt>
              <dd>
                {worldContext && worldContextWikipediaHref ? (
                  <a
                    className={styles.newsLink}
                    href={worldContextWikipediaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.newsLinkText}>{worldContext.summary}</span>
                    <HoverArrow
                      className={styles.newsLinkIcon}
                    />
                  </a>
                ) : 'The story of this year is still being written.'}
              </dd>
            </div>
          </dl>
        </aside>
      )}
    </section>
  )
}

'use client'

import type { ComponentProps } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import styles from './Calendar.module.css'

function Calendar({
  className,
  classNames,
  components,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={[styles.calendar, className].filter(Boolean).join(' ')}
      classNames={{
        months: styles.months,
        month: styles.month,
        month_caption: styles.monthCaption,
        caption_label: styles.captionLabel,
        nav: styles.nav,
        button_previous: styles.previousButton,
        button_next: styles.nextButton,
        month_grid: styles.monthGrid,
        weekdays: styles.weekdays,
        weekday: styles.weekday,
        week: styles.week,
        day: styles.day,
        day_button: styles.dayButton,
        selected: styles.selected,
        today: styles.today,
        outside: styles.outside,
        disabled: styles.disabled,
        hidden: styles.hidden,
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) => (
          orientation === 'left'
            ? <ChevronLeftIcon aria-hidden="true" {...iconProps} />
            : <ChevronRightIcon aria-hidden="true" {...iconProps} />
        ),
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }

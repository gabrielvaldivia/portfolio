import type { GlobalConfig } from 'payload'

import {
  DEFAULT_TIMELINE_CHAPTERS,
  TIMELINE_CHAPTER_COUNT,
  type TimelineChapter,
} from '../data/timelineContent'

function validateChapters(value: unknown) {
  if (!Array.isArray(value) || value.length !== TIMELINE_CHAPTER_COUNT) {
    return `Timeline must contain the prologue and all ${TIMELINE_CHAPTER_COUNT - 1} chapters.`
  }

  for (let index = 0; index < value.length; index += 1) {
    const chapter = value[index] as Partial<TimelineChapter> | null
    const label = index === 0 ? 'Prologue' : `Chapter ${index}`

    if (!chapter || typeof chapter.title !== 'string' || !chapter.title.trim()) {
      return `${label} needs a title.`
    }

    if (
      !Array.isArray(chapter.paragraphs) ||
      chapter.paragraphs.length === 0 ||
      chapter.paragraphs.some(
        (paragraph) => typeof paragraph !== 'string' || !paragraph.trim(),
      )
    ) {
      return `${label} needs at least one complete paragraph.`
    }
  }

  return true
}

export const Timeline: GlobalConfig = {
  slug: 'timeline',
  label: 'Timeline',
  admin: {
    group: 'Pages',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'chapters',
      type: 'json',
      label: 'Chapters',
      required: true,
      defaultValue: DEFAULT_TIMELINE_CHAPTERS,
      validate: validateChapters,
      admin: {
        description:
          'Edit the title and narrative for every timeline chapter. Dates, locations, education, work, and news remain mapped to the timeline itself.',
        components: {
          Field: './components/admin/TimelineEditor#TimelineEditor',
        },
      },
    },
  ],
}

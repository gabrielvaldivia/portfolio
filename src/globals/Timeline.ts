import type { GlobalConfig } from 'payload'

import {
  DEFAULT_TIMELINE_CHAPTERS,
  TIMELINE_CHAPTER_COUNT,
} from '../data/timelineContent'

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
      type: 'array',
      label: 'Chapters',
      labels: {
        singular: 'Chapter',
        plural: 'Chapters',
      },
      required: true,
      minRows: TIMELINE_CHAPTER_COUNT,
      maxRows: TIMELINE_CHAPTER_COUNT,
      defaultValue: DEFAULT_TIMELINE_CHAPTERS,
      admin: {
        description:
          'Edit the title and narrative for every timeline chapter. Dates, locations, education, work, and news remain mapped to the timeline itself.',
        initCollapsed: true,
        isSortable: false,
        components: {
          RowLabel: './components/admin/TimelineChapterRowLabel#TimelineChapterRowLabel',
        },
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
        },
        {
          name: 'content',
          type: 'richText',
          label: 'Content',
          required: true,
        },
      ],
    },
  ],
}

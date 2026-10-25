import { lexicalEditor, UploadFeature } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { NoteLinkedImagesFeature } from '../components/admin/noteLinkedImages/feature.server'
import { isCmsUser } from '../lib/cmsAccess'
import { queuePublishedNoteNewsletter } from '../lib/noteNewsletter'
import { generateNotePreviewURL } from '../lib/notePreview'
import { prepareNotePublication } from '../lib/notePublishing'
import { syncNoteStats } from '../lib/noteStats'

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const Notes: CollectionConfig = {
  slug: 'notes',
  labels: {
    singular: 'Note',
    plural: 'Notes',
  },
  defaultSort: '-publishedAt',
  admin: {
    group: 'Collections',
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'publishedAt', 'views', 'likes'],
    preview: generateNotePreviewURL,
    components: {
      beforeListTable: ['./components/admin/NotesListSortControl#NotesListSortControl'],
      edit: {
        editMenuItems: ['./components/admin/NotesEditMenu#NotesEditMenu'],
        PublishButton: './components/admin/NotesEditMenu#NotesPublishButton',
        PreviewButton: './components/admin/NotesPreviewButton#NotesPreviewButton',
      },
    },
  },
  access: {
    read: ({ req }) => (
      isCmsUser({ req })
        ? true
        : { _status: { equals: 'published' } }
    ),
  },
  endpoints: [{
    path: '/:id/cancel-schedule',
    method: 'post',
    handler: async (req) => {
      if (!isCmsUser({ req })) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const id = Number(req.routeParams?.id)
      if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: 'Invalid note' }, { status: 400 })
      const doc = await req.payload.update({ collection: 'notes', id, data: { _status: 'draft' },
        draft: false, unpublishAllLocales: true, overrideAccess: false, req, context: { cancelNoteSchedule: true } })
      return Response.json({ doc }, { headers: { 'Cache-Control': 'no-store' } })
    },
  }],
  hooks: {
    beforeOperation: [
      async ({ args, operation, req }) => {
        // Refresh stored view and like totals before editors list notes, so sorting is current.
        if (operation !== 'read' || 'id' in args || !isCmsUser({ req })) return args
        try {
          await syncNoteStats(req.payload.db.drizzle)
        } catch (error) {
          req.payload.logger.error({ err: error, msg: 'Unable to refresh note view and like totals' })
        }
        return args
      },
    ],
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data

        if (!data.slug) {
          // Autosave creates untitled drafts before the editor opens. Unlike an
          // empty string, null can repeat safely in the unique slug index.
          data.slug = slugify(data.title || originalDoc?.title || '') || null
        }

        return data
      },
    ],
    beforeChange: [prepareNotePublication],
    afterChange: [
      async ({ context, doc, operation, req }) => {
        const isFirstPublish = doc._status === 'published' && !doc.newsletterSentAt && context.firstNotePublication

        if (context.skipNoteNewsletter || !isFirstPublish || (operation !== 'create' && operation !== 'update')) {
          return doc
        }

        // Queue in the publication transaction. A storage failure rolls back
        // publication so a retry cannot silently lose the newsletter.
        const { recipientCount } = await queuePublishedNoteNewsletter(doc, req.payload, req)
        req.payload.logger.info(`Queued note ${doc.id} for ${recipientCount} email subscriber(s)`)

        return doc
      },
    ],
  },
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 50,
  },
  fields: [
    // Totals copied from note_views and module_likes by syncNoteStats so the list can sort by them.
    {
      name: 'views',
      type: 'number',
      label: 'Views',
      defaultValue: 0,
      admin: {
        condition: () => false,
        readOnly: true,
        components: { Cell: './components/admin/NoteStatsCell#CountCell' },
      },
    },
    {
      name: 'likes',
      type: 'number',
      label: 'Likes',
      defaultValue: 0,
      admin: {
        condition: () => false,
        readOnly: true,
        components: { Cell: './components/admin/NoteStatsCell#CountCell' },
      },
    },
    {
      type: 'tabs',
      admin: {
        className: 'notes-editor-tabs',
      },
      tabs: [
        {
          label: 'Writing',
          fields: [
            {
              name: 'title',
              type: 'textarea',
              required: true,
              admin: {
                className: 'notes-editor-title',
                placeholder: 'Untitled note',
                rows: 1,
              },
            },
            {
              name: 'body',
              type: 'richText',
              required: true,
              editor: lexicalEditor({
                admin: {
                  hideGutter: true,
                  hideInsertParagraphAtEnd: true,
                  placeholder: 'Start writing…',
                },
                features: ({ defaultFeatures }) => [
                  ...defaultFeatures.filter((feature) => feature.key !== 'upload'),
                  UploadFeature({ enabledCollections: ['media'] }),
                  NoteLinkedImagesFeature(),
                ],
              }),
              admin: {
                className: 'notes-editor-body',
              },
            },
          ],
        },
        {
          label: 'Metadata',
          fields: [
            { name: 'newsletterDelivery', type: 'ui', admin: { components: { Field: './components/admin/NoteNewsletterStatus#NoteNewsletterStatus' } } },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                description: 'Generated from the title when left blank.',
              },
            },
            {
              name: 'publishedAt',
              label: 'Publish date',
              type: 'date',
              index: true,
              admin: {
                components: { Cell: './components/admin/ShortDateCell#ShortDateCell' },
                description: 'Choose a future date and time, then click Schedule. Leave blank to publish now. Times use your device’s time zone.',
                date: {
                  pickerAppearance: 'dayAndTime',
                  timeIntervals: 5,
                },
              },
            },
            {
              name: 'excerpt',
              type: 'textarea',
              admin: {
                description: 'A short introduction used on the Notes index and in search results.',
              },
            },
            {
              name: 'coverImage',
              label: 'Cover image',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'meta',
              label: 'SEO',
              type: 'group',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  admin: {
                    description: 'Optional search and social title. Defaults to the note title.',
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  admin: {
                    description: 'Optional search description. Defaults to the excerpt.',
                  },
                },
                {
                  name: 'image',
                  label: 'Social image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description: 'Optional social share image. Defaults to the cover image.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Highlights',
          fields: [{
            name: 'highlightModeration',
            type: 'ui',
            admin: { components: { Field: './components/admin/NoteHighlightModeration#NoteHighlightModeration' } },
          }],
        },
      ],
    },
    { name: 'scheduledFor', type: 'date', index: true, admin: { hidden: true } },
    { name: 'firstPublishedAt', type: 'date', admin: { hidden: true } },
    {
      name: 'newsletterSentAt',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
  ],
}

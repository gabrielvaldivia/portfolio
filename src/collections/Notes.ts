import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { NoteLinkedImagesFeature } from '../components/admin/noteLinkedImages/feature.server'
import { sendPublishedNoteNewsletter } from '../lib/noteNewsletter'
import { generateNotePreviewURL } from '../lib/notePreview'
import { prepareNotePublication } from '../lib/notePublishing'

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
    defaultColumns: ['title', '_status', 'publishedAt', 'updatedAt'],
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
      req.user
        ? true
        : { _status: { equals: 'published' } }
    ),
  },
  endpoints: [{
    path: '/:id/cancel-schedule',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
      const id = Number(req.routeParams?.id)
      if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: 'Invalid note' }, { status: 400 })
      const doc = await req.payload.update({ collection: 'notes', id, data: { _status: 'draft' },
        draft: false, unpublishAllLocales: true, overrideAccess: false, req, context: { cancelNoteSchedule: true } })
      return Response.json({ doc }, { headers: { 'Cache-Control': 'no-store' } })
    },
  }],
  hooks: {
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

        try {
          const { recipientCount } = await sendPublishedNoteNewsletter(doc, req.payload, req)
          await req.payload.update({
            collection: 'notes',
            id: doc.id,
            data: { newsletterSentAt: new Date().toISOString() },
            context: { skipNoteNewsletter: true },
            draft: false,
            overrideAccess: true,
            req,
          })
          req.payload.logger.info(`Sent note ${doc.id} to ${recipientCount} email subscriber(s)`)
        } catch (error) {
          req.payload.logger.error({ err: error, msg: `Could not send newsletter for note ${doc.id}` })
        }

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
                  ...defaultFeatures,
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

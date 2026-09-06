import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
import { NoteLinkedImagesFeature } from '../components/admin/noteLinkedImages/feature.server'
import { sendPublishedNoteNewsletter } from '../lib/noteNewsletter'

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
    components: {
      edit: {
        editMenuItems: ['./components/admin/NotesEditMenu#NotesEditMenu'],
        PublishButton: './components/admin/NotesEditMenu#NotesPublishButton',
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
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data

        if (!data.slug) {
          data.slug = slugify(data.title || originalDoc?.title || '')
        }

        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        if (data._status === 'published' && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }

        return data
      },
    ],
    afterChange: [
      async ({ context, doc, operation, previousDoc, req }) => {
        const wasPublished = previousDoc?._status === 'published' || Boolean(previousDoc?.publishedAt)
        const isFirstPublish = doc._status === 'published' && !doc.newsletterSentAt && !wasPublished

        if (context.skipNoteNewsletter || !isFirstPublish || (operation !== 'create' && operation !== 'update')) {
          return doc
        }

        try {
          const { recipientCount } = await sendPublishedNoteNewsletter(doc, req.payload)
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
              type: 'date',
              index: true,
              admin: {
                description: 'Set automatically the first time this note is published.',
                date: {
                  pickerAppearance: 'dayAndTime',
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
      ],
    },
    {
      name: 'newsletterSentAt',
      type: 'date',
      admin: {
        hidden: true,
      },
    },
  ],
}

import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

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
  ],
}

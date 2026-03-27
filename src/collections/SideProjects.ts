import type { CollectionConfig } from 'payload'
import { contentBlocks } from './Projects'

export const SideProjects: CollectionConfig = {
  slug: 'side-projects',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Work',
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'order'],
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Sidebar ──
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    },

    // ── Info ──
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Info',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea' },
            { name: 'richDescription', type: 'richText' },
            { name: 'year', type: 'text' },
            {
              name: 'collaborators',
              type: 'relationship',
              relationTo: 'people',
              hasMany: true,
            },
            {
              name: 'links',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'content',
              type: 'blocks',
              admin: { initCollapsed: true },
              blocks: contentBlocks,
            },
          ],
        },
      ],
    },
  ],
}

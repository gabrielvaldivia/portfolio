import type { CollectionConfig } from 'payload'

export const SideProjects: CollectionConfig = {
  slug: 'side-projects',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Work',
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'linkType',
      type: 'select',
      defaultValue: 'external',
      options: [
        { label: 'External URL', value: 'external' },
        { label: 'Internal Page', value: 'internal' },
      ],
    },
    {
      name: 'url',
      type: 'text',
      admin: { condition: (_: any, siblingData: any) => siblingData?.linkType === 'external' },
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      admin: { condition: (_: any, siblingData: any) => siblingData?.linkType === 'internal' },
    },
    { name: 'year', type: 'text' },
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
}

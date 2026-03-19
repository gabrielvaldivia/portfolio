import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Work',
    useAsTitle: 'name',
    defaultColumns: ['name', 'website', 'order'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media' },
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
      name: 'website',
      type: 'text',
      admin: { condition: (_: any, siblingData: any) => siblingData?.linkType === 'external' },
    },
    {
      name: 'page',
      type: 'relationship',
      relationTo: ['pages', 'projects'],
      admin: { condition: (_: any, siblingData: any) => siblingData?.linkType === 'internal' },
    },
    { name: 'description', type: 'textarea' },
    { name: 'order', type: 'number', defaultValue: 0 },
    {
      name: 'projects',
      type: 'join',
      collection: 'projects',
      on: 'client',
    },
  ],
}

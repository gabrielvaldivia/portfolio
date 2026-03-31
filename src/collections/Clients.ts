import type { CollectionConfig } from 'payload'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Collections',
    useAsTitle: 'name',
    defaultColumns: ['name', 'active', 'website'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    { name: 'website', type: 'text' },
    { name: 'description', type: 'textarea' },
    { name: 'details', type: 'textarea', admin: { description: 'Longer description used as context for the AI chat. Not shown on the site.' } },
    { name: 'active', type: 'checkbox', defaultValue: false, label: 'Active Client' },
    {
      type: 'collapsible',
      label: 'Projects',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'projects',
          label: ' ',
          type: 'join',
          collection: 'projects',
          on: 'client',
        },
      ],
    },
  ],
}

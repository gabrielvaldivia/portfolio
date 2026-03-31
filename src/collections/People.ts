import type { CollectionConfig } from 'payload'

export const People: CollectionConfig = {
  slug: 'people',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Collections',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'company', 'featuredTestimonial'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'linkedIn', type: 'text', label: 'Link' },
    { name: 'role', type: 'text' },
    { name: 'company', type: 'relationship', relationTo: 'clients' },
    {
      name: 'testimonial',
      type: 'textarea',
      admin: {
        description: 'A quote from this person about working together',
      },
    },
    {
      name: 'featuredTestimonial',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Show this testimonial on the homepage',
      },
    },
    {
      name: 'projects',
      type: 'join',
      collection: 'projects',
      on: 'team',
    },
  ],
}

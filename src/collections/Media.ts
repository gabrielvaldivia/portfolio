import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Admin',
    useAsTitle: 'alt',
  },
  upload: {
    mimeTypes: ['image/*', 'video/*'],
    imageSizes: [
      { name: 'thumbnail', width: 300, height: undefined, position: 'centre' },
      { name: 'small', width: 600, height: undefined, position: 'centre' },
      { name: 'medium', width: 900, height: undefined, position: 'centre' },
      { name: 'large', width: 1400, height: undefined, position: 'centre' },
      { name: 'xlarge', width: 1920, height: undefined, position: 'centre' },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}

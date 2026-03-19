import type { Block } from 'payload'

export const FullWidthImage: Block = {
  slug: 'fullWidthImage',
  labels: { singular: 'Full Width Image', plural: 'Full Width Images' },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
      validate: (() => true as true) as any,
    },
    { name: 'border', type: 'checkbox', defaultValue: false },
  ],
}

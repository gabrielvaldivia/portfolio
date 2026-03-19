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
      validate: (value: any, { required }: any) => {
        // Allow empty/null values
        return true
      },
    },
    { name: 'border', type: 'checkbox', defaultValue: false },
  ],
}

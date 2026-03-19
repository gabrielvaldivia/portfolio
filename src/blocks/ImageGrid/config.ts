import type { Block } from 'payload'

export const ImageGrid: Block = {
  slug: 'imageGrid',
  labels: { singular: 'Image Grid', plural: 'Image Grids' },
  fields: [
    {
      name: 'columns',
      type: 'select',
      defaultValue: '2',
      options: [
        { label: '1 Column', value: '1' },
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
      ],
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'border', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}

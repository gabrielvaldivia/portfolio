import type { Block } from 'payload'

export const TwoColumn: Block = {
  slug: 'twoColumn',
  labels: { singular: 'Two Column', plural: 'Two Columns' },
  fields: [
    {
      name: 'ratio',
      type: 'select',
      defaultValue: '50-50',
      options: [
        { label: '50 / 50', value: '50-50' },
        { label: '33 / 67', value: '33-67' },
        { label: '67 / 33', value: '67-33' },
      ],
    },
    { name: 'leftContent', type: 'richText' },
    { name: 'leftImage', type: 'upload', relationTo: 'media' },
    { name: 'rightContent', type: 'richText' },
    { name: 'rightImage', type: 'upload', relationTo: 'media' },
  ],
}

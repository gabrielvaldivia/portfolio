import type { Block } from 'payload'

export const TextBlock: Block = {
  slug: 'textBlock',
  labels: { singular: 'Text Block', plural: 'Text Blocks' },
  fields: [
    { name: 'content', type: 'richText', required: true },
    {
      name: 'width',
      type: 'select',
      defaultValue: 'full',
      options: [
        { label: 'Full Width', value: 'full' },
        { label: 'Narrow', value: 'narrow' },
      ],
    },
  ],
}

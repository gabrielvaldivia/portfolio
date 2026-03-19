import type { Block } from 'payload'

export const FullWidthVideo: Block = {
  slug: 'fullWidthVideo',
  labels: { singular: 'Full Width Video', plural: 'Full Width Videos' },
  fields: [
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'url', type: 'text' },
    { name: 'autoplay', type: 'checkbox', defaultValue: true },
    { name: 'loop', type: 'checkbox', defaultValue: true },
    { name: 'muted', type: 'checkbox', defaultValue: true },
    { name: 'controls', type: 'checkbox', defaultValue: false },
  ],
}

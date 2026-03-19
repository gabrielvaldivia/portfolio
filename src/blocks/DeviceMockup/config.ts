import type { Block } from 'payload'

export const DeviceMockup: Block = {
  slug: 'deviceMockup',
  labels: { singular: 'Device Mockup', plural: 'Device Mockups' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    {
      name: 'deviceType',
      type: 'select',
      defaultValue: 'phone',
      options: [
        { label: 'Phone', value: 'phone' },
        { label: 'Tablet', value: 'tablet' },
        { label: 'Desktop', value: 'desktop' },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'single',
      options: [
        { label: 'Single', value: 'single' },
        { label: 'Side by Side', value: 'side-by-side' },
        { label: 'Triple', value: 'triple' },
      ],
    },
    {
      name: 'additionalImages',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
      ],
    },
  ],
}

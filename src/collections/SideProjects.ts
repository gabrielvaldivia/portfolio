import type { Block, CollectionConfig } from 'payload'

const layoutFields = {
  type: 'row' as const,
  fields: [
    {
      name: 'columns',
      type: 'select' as const,
      defaultValue: '6',
      options: [
        { label: '1 Col', value: '1' },
        { label: '2 Col', value: '2' },
        { label: '3 Col', value: '3' },
        { label: '4 Col', value: '4' },
        { label: '5 Col', value: '5' },
        { label: '6 Col', value: '6' },
      ],
    },
    {
      name: 'rows',
      type: 'select' as const,
      defaultValue: '1',
      options: [
        { label: '1 Row', value: '1' },
        { label: '2 Row', value: '2' },
        { label: '3 Row', value: '3' },
        { label: '4 Row', value: '4' },
        { label: '5 Row', value: '5' },
        { label: '6 Row', value: '6' },
      ],
    },
  ],
}

const TextBlock: Block = {
  slug: 'text',
  labels: { singular: 'Text', plural: 'Text Blocks' },
  fields: [
    layoutFields,
    { name: 'title', type: 'text' },
    { name: 'content', type: 'richText', required: true },
  ],
}

const ImageBlock: Block = {
  slug: 'image',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    layoutFields,
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text' },
    {
      type: 'row' as const,
      fields: [
        { name: 'height', type: 'number' as const },
        { name: 'maxHeight', type: 'number' as const },
        {
          name: 'fit',
          type: 'select' as const,
          defaultValue: 'cover',
          options: [
            { label: 'Fill', value: 'cover' },
            { label: 'Fit', value: 'contain' },
          ],
        },
      ],
    },
    {
      type: 'row' as const,
      fields: [
        { name: 'padding', type: 'number' as const },
        { name: 'bgColor', type: 'text' as const, defaultValue: 'alt' },
      ],
    },
    { name: 'border', type: 'checkbox', defaultValue: false },
  ],
}

const VideoBlock: Block = {
  slug: 'video',
  labels: { singular: 'Video', plural: 'Videos' },
  fields: [
    layoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'url', type: 'text' },
    { name: 'caption', type: 'text' },
    { name: 'autoplay', type: 'checkbox', defaultValue: true },
    { name: 'loop', type: 'checkbox', defaultValue: true },
    { name: 'muted', type: 'checkbox', defaultValue: true },
    { name: 'controls', type: 'checkbox', defaultValue: false },
  ],
}

export const SideProjects: CollectionConfig = {
  slug: 'side-projects',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Work',
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'order'],
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Sidebar ──
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: { position: 'sidebar' },
    },

    // ── Info ──
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Info',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'description', type: 'textarea' },
            { name: 'richDescription', type: 'richText' },
            {
              name: 'team',
              type: 'relationship',
              relationTo: 'people',
              hasMany: true,
            },
            {
              name: 'services',
              type: 'relationship',
              relationTo: 'services',
              hasMany: true,
            },
            { name: 'year', type: 'text' },
            { name: 'image', type: 'upload', relationTo: 'media' },
            {
              name: 'linkType',
              type: 'select',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'External URL', value: 'external' },
                { label: 'Internal Page', value: 'internal' },
              ],
            },
            {
              name: 'url',
              type: 'text',
              admin: { condition: (_: any, siblingData: any) => siblingData?.linkType === 'external' },
            },
            {
              name: 'page',
              type: 'relationship',
              relationTo: 'pages',
              admin: { condition: (_: any, siblingData: any) => siblingData?.linkType === 'internal' },
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'content',
              type: 'blocks',
              admin: { initCollapsed: true },
              blocks: [TextBlock, ImageBlock, VideoBlock],
            },
          ],
        },
      ],
    },
  ],
}

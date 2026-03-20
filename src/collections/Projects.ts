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

// ── Content Blocks ──

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
        {
          name: 'padding',
          type: 'select' as const,
          options: [
            { label: 'None', value: '0' },
            { label: 'XS (10px)', value: '10' },
            { label: 'S (20px)', value: '20' },
            { label: 'M (40px)', value: '40' },
            { label: 'L (60px)', value: '60' },
            { label: 'XL (80px)', value: '80' },
          ],
        },
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
    {
      name: 'fit',
      type: 'select' as const,
      defaultValue: 'cover',
      options: [
        { label: 'Fill', value: 'cover' },
        { label: 'Fit', value: 'contain' },
      ],
    },
    { name: 'bgColor', type: 'text' as const, defaultValue: 'alt' },
    { name: 'border', type: 'checkbox' as const, defaultValue: false },
    { name: 'autoplay', type: 'checkbox', defaultValue: true },
    { name: 'loop', type: 'checkbox', defaultValue: true },
    { name: 'muted', type: 'checkbox', defaultValue: true },
    { name: 'controls', type: 'checkbox', defaultValue: false },
  ],
}


const DC1Block: Block = {
  slug: 'dc1',
  labels: { singular: 'DC-1', plural: 'DC-1 Blocks' },
  fields: [
    layoutFields,
    { name: 'video', type: 'upload', relationTo: 'media', required: true },
  ],
}

const iPhone15Block: Block = {
  slug: 'iphone15',
  labels: { singular: 'iPhone 15', plural: 'iPhone 15 Blocks' },
  fields: [
    layoutFields,
    { name: 'video', type: 'upload', relationTo: 'media', required: true },
  ],
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Work',
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'featured', 'order'],
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Sidebar ──
    {
      name: 'slug',
      type: 'text',
      required: true,
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
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      admin: { position: 'sidebar' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
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
            { name: 'subtitle', type: 'text' },
            { name: 'description', type: 'richText' },
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
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'content',
              type: 'blocks',
              admin: { initCollapsed: true },
              blocks: [TextBlock, ImageBlock, VideoBlock, DC1Block, iPhone15Block],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'meta',
              type: 'group',
              fields: [
                { name: 'title', type: 'text' },
                { name: 'description', type: 'textarea' },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
      ],
    },
  ],
}

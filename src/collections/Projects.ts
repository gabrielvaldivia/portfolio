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

const textLayoutFields = {
  type: 'row' as const,
  fields: [
    {
      name: 'columns',
      label: 'Width',
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
      label: 'Height',
      type: 'select' as const,
      defaultValue: 'wrap',
      options: [
        { label: '1 Row', value: '1' },
        { label: '2 Row', value: '2' },
        { label: '3 Row', value: '3' },
        { label: '4 Row', value: '4' },
        { label: '5 Row', value: '5' },
        { label: '6 Row', value: '6' },
        { label: 'Wrap', value: 'wrap' },
      ],
    },
  ],
}

const TextBlock: Block = {
  slug: 'text',
  labels: { singular: 'Text', plural: 'Text Blocks' },
  imageURL: '/block-icons/Text.svg',
  fields: [
    textLayoutFields,
    { name: 'title', type: 'text' },
    { name: 'content', type: 'richText', required: true },
  ],
}

const imageLayoutFields = {
  type: 'row' as const,
  fields: [
    {
      name: 'columns',
      label: 'Width',
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
      label: 'Height',
      type: 'select' as const,
      defaultValue: 'wrap',
      options: [
        { label: '1 Row', value: '1' },
        { label: '2 Row', value: '2' },
        { label: '3 Row', value: '3' },
        { label: '4 Row', value: '4' },
        { label: '5 Row', value: '5' },
        { label: '6 Row', value: '6' },
        { label: 'Wrap', value: 'wrap' },
      ],
    },
  ],
}

const ImageBlock: Block = {
  slug: 'image',
  labels: { singular: 'Image', plural: 'Images' },
  imageURL: '/block-icons/Photo.svg',
  fields: [
    imageLayoutFields,
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text' },
    {
      type: 'row' as const,
      fields: [
        {
          name: 'fit',
          type: 'select' as const,
          defaultValue: 'cover',
          options: [
            { label: 'Fill', value: 'cover' },
            { label: 'Fit', value: 'contain' },
          ],
        },
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
    {
      type: 'row' as const,
      fields: [
        { name: 'border', type: 'checkbox' as const, defaultValue: false, label: 'Container Border' },
        { name: 'imageBorder', type: 'checkbox' as const, defaultValue: false, label: 'Image Border' },
        { name: 'rounded', type: 'checkbox' as const, defaultValue: false },
        { name: 'shadow', type: 'checkbox' as const, defaultValue: false },
      ],
    },
  ],
}

const VideoBlock: Block = {
  slug: 'video',
  labels: { singular: 'Video', plural: 'Videos' },
  imageURL: '/block-icons/Video.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'caption', type: 'text' },
    {
      type: 'row' as const,
      fields: [
        {
          name: 'fit',
          type: 'select' as const,
          defaultValue: 'cover',
          options: [
            { label: 'Fill', value: 'cover' },
            { label: 'Fit', value: 'contain' },
          ],
        },
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
    {
      type: 'row' as const,
      fields: [
        { name: 'border', type: 'checkbox' as const, defaultValue: false },
        { name: 'autoplay', type: 'checkbox' as const, defaultValue: true },
        { name: 'loop', type: 'checkbox' as const, defaultValue: true },
        { name: 'muted', type: 'checkbox' as const, defaultValue: true },
        { name: 'controls', type: 'checkbox' as const, defaultValue: false },
      ],
    },
  ],
}


const DC1Block: Block = {
  slug: 'dc1',
  labels: { singular: 'DC-1', plural: 'DC-1 Blocks' },
  imageURL: '/block-icons/dc1.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media', required: true },
  ],
}

const iPhone15Block: Block = {
  slug: 'iphone15',
  labels: { singular: 'iPhone 15', plural: 'iPhone 15 Blocks' },
  imageURL: '/block-icons/iphone-15.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'showNotch', type: 'checkbox', defaultValue: false },
  ],
}

const iPhone13MiniBlock: Block = {
  slug: 'iphone13mini',
  labels: { singular: 'iPhone 13 Mini', plural: 'iPhone 13 Mini Blocks' },
  imageURL: '/block-icons/iphone13.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}

const iPhone5Block: Block = {
  slug: 'iphone5',
  labels: { singular: 'iPhone 5', plural: 'iPhone 5 Blocks' },
  imageURL: '/block-icons/iphone5.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}

const iPhone6Block: Block = {
  slug: 'iphone6',
  labels: { singular: 'iPhone 6', plural: 'iPhone 6 Blocks' },
  imageURL: '/block-icons/iphone6.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}

const iPhoneXBlock: Block = {
  slug: 'iphonex',
  labels: { singular: 'iPhone X', plural: 'iPhone X Blocks' },
  imageURL: '/block-icons/iphonex.svg',
  fields: [
    imageLayoutFields,
    { name: 'video', type: 'upload', relationTo: 'media' },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
}

export const contentBlocks = [DC1Block, ImageBlock, iPhone5Block, iPhone6Block, iPhoneXBlock, iPhone13MiniBlock, iPhone15Block, TextBlock, VideoBlock]

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    pagination: { defaultLimit: 100 },
    group: 'Collections',
    useAsTitle: 'title',
    defaultColumns: ['title', 'year', 'featured', 'order'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.featured === previousDoc?.featured) return doc
        try {
          const homePage = await req.payload.find({
            collection: 'pages',
            where: { slug: { equals: 'home' } },
            limit: 1,
            depth: 0,
          })
          const page = homePage.docs[0]
          if (!page) return doc
          const sections = (page as any).sections || []
          let changed = false
          for (const section of sections) {
            if (section.blockType === 'hScroll' && section.source === 'featuredProjects') {
              const projectIds: number[] = (section.projects || []).map((p: any) => typeof p === 'object' ? p.id : p)
              if (doc.featured && !projectIds.includes(doc.id)) {
                projectIds.push(doc.id)
                section.projects = projectIds
                changed = true
              } else if (!doc.featured && projectIds.includes(doc.id)) {
                section.projects = projectIds.filter((id: number) => id !== doc.id)
                changed = true
              }
            }
          }
          if (changed) {
            await req.payload.update({
              collection: 'pages',
              id: page.id,
              data: { sections },
              depth: 0,
            })
          }
        } catch (e) {
          // Silent fail — don't block project save
        }
        return doc
      },
    ],
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
              blocks: contentBlocks,
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

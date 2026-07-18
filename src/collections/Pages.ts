import type { Block, CollectionConfig, Field } from 'payload'
import { SectionHeader } from '../blocks/SectionHeader/config'
import { FullWidthImage } from '../blocks/FullWidthImage/config'
import { FullWidthVideo } from '../blocks/FullWidthVideo/config'
import { DeviceMockup } from '../blocks/DeviceMockup/config'
import { TextBlock } from '../blocks/TextBlock/config'
import { TwoColumn } from '../blocks/TwoColumn/config'

const isType = (type: string) => (data: any) => data?.type === type

const sizeFields: Field = {
  type: 'row',
  admin: { position: 'sidebar' },
  fields: [
    {
      name: 'columns',
      label: 'Width',
      type: 'select',
      defaultValue: '6',
      options: [
        { label: '1 col', value: '1' },
        { label: '2 cols', value: '2' },
        { label: '3 cols', value: '3' },
        { label: '4 cols', value: '4' },
        { label: '5 cols', value: '5' },
        { label: '6 cols', value: '6' },
      ],
    },
    {
      name: 'rows',
      label: 'Height',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: 'Auto', value: 'auto' },
        { label: '1 row', value: '1' },
        { label: '2 rows', value: '2' },
        { label: '3 rows', value: '3' },
        { label: '4 rows', value: '4' },
        { label: '5 rows', value: '5' },
        { label: '6 rows', value: '6' },
        { label: '7 rows', value: '7' },
        { label: '8 rows', value: '8' },
        { label: '9 rows', value: '9' },
        { label: '10 rows', value: '10' },
      ],
    },
  ],
}

// ── Section Blocks (for Home page) ──

const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    sizeFields,
    { name: 'heading', type: 'text', required: true },
    { name: 'fullWidth', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}

const HScrollBlock: Block = {
  slug: 'hScroll',
  labels: { singular: 'Horizontal Scroll', plural: 'Horizontal Scrolls' },
  fields: [
    sizeFields,
    { name: 'title', type: 'text' },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: [
        { label: 'Projects', value: 'featuredProjects' },
        { label: 'Testimonials', value: 'featuredTestimonials' },
      ],
    },
    {
      name: 'projects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      admin: {
        condition: (_: any, siblingData: any) => siblingData?.source === 'featuredProjects',
      },
    },
    {
      name: 'testimonials',
      type: 'relationship',
      relationTo: 'people',
      hasMany: true,
      admin: {
        condition: (_: any, siblingData: any) => siblingData?.source === 'featuredTestimonials',
      },
    },
    { name: 'fullWidth', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}

const AboutBlock: Block = {
  slug: 'aboutSection',
  labels: { singular: 'About', plural: 'About Sections' },
  fields: [
    sizeFields,
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Image (Light Mode)' },
    { name: 'imageDark', type: 'upload', relationTo: 'media', label: 'Image (Dark Mode)' },
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'richText' },
  ],
}

const PillGridBlock: Block = {
  slug: 'pillGrid',
  labels: { singular: 'Pill Grid', plural: 'Pill Grids' },
  fields: [
    sizeFields,
    { name: 'title', type: 'text', defaultValue: 'Capabilities' },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'featuredServices',
      options: [
        { label: 'Featured Services', value: 'featuredServices' },
      ],
    },
  ],
}

const NumberedGridBlock: Block = {
  slug: 'numberedGrid',
  labels: { singular: 'Numbered Grid', plural: 'Numbered Grids' },
  fields: [
    sizeFields,
    { name: 'title', type: 'text', defaultValue: 'Approach' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'text', type: 'richText', required: true },
      ],
    },
  ],
}

const MarqueeBlock: Block = {
  slug: 'marqueeSection',
  labels: { singular: 'Marquee', plural: 'Marquees' },
  fields: [
    sizeFields,
    { name: 'title', type: 'text', defaultValue: 'Clients' },
    {
      name: 'clients',
      type: 'relationship',
      relationTo: 'clients',
      hasMany: true,
    },
    { name: 'linkUrl', type: 'text', defaultValue: '/clients' },
    { name: 'linkText', type: 'text', defaultValue: 'View all' },
    { name: 'speed', type: 'number', defaultValue: 60 },
    { name: 'fontSize', type: 'number', defaultValue: 48 },
    { name: 'gap', type: 'number', defaultValue: 60 },
    { name: 'opacity', type: 'number', defaultValue: 30 },
  ],
}

const AccordionBlock: Block = {
  slug: 'accordion',
  labels: { singular: 'Chat', plural: 'Chats' },
  fields: [
    sizeFields,
    { name: 'fixedHeight', type: 'text', label: 'Fixed Height', defaultValue: '80dvh', admin: { description: 'CSS height value (e.g. 70dvh, 600px, auto). Applied on mobile, overridden by rows on desktop.' } },
    { name: 'title', type: 'text', defaultValue: 'Ask me anything' },
    { name: 'apiKey', type: 'text', label: 'Anthropic API Key', admin: { description: 'Your Claude API key (sk-ant-...)' } },
    { name: 'model', type: 'text', label: 'Model', defaultValue: 'claude-haiku-4-5-20251001', admin: { description: 'Claude model ID (e.g. claude-haiku-4-5-20251001, claude-sonnet-4-5-20250514)' } },
    { name: 'gabosApiUrl', type: 'text', label: 'Content API URL', defaultValue: 'https://gabos.vercel.app', admin: { description: 'URL for the gabos content API (blog + tweets)' } },
    { name: 'systemPromptExtra', type: 'textarea', label: 'Extra Instructions', admin: { description: 'Additional instructions appended to the system prompt' } },
    {
      name: 'items',
      type: 'array',
      label: 'Suggested Questions',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'richText', required: true },
      ],
    },
    {
      name: 'links',
      type: 'array',
      label: 'Quick Links',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
}

const CalloutBlock: Block = {
  slug: 'callout',
  labels: { singular: 'Callout', plural: 'Callouts' },
  fields: [
    sizeFields,
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'richText' },
    { name: 'availability', type: 'text', admin: { description: 'e.g. "Available for new projects"' } },
  ],
}

const SocialLinksBlock: Block = {
  slug: 'socialLinks',
  labels: { singular: 'Contact', plural: 'Contact Sections' },
  fields: [
    sizeFields,
    { name: 'title', type: 'text', defaultValue: 'Contact' },
    {
      name: 'links',
      type: 'array',
      label: 'Contact Links',
      admin: { description: 'Add each social profile or contact method to show on the homepage.' },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            { label: 'Email', value: 'Email' },
            { label: 'X / Twitter', value: 'Twitter' },
            { label: 'LinkedIn', value: 'LinkedIn' },
            { label: 'Substack', value: 'Substack' },
            { label: 'Threads', value: 'Threads' },
          ],
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
}

const aboutMediaFields: Field[] = [
  { name: 'title', type: 'text', required: true },
  { name: 'event', type: 'text', required: true },
  { name: 'year', type: 'text' },
  { name: 'duration', type: 'text' },
  { name: 'url', type: 'text' },
  { name: 'thumbnail', type: 'upload', relationTo: 'media' },
]

const aboutPatentFields: Field[] = [
  { name: 'patentId', type: 'text', required: true },
  { name: 'title', type: 'text', required: true },
  { name: 'url', type: 'text' },
]

const AboutBioSectionBlock: Block = {
  slug: 'aboutBioSection',
  labels: { singular: 'Bio', plural: 'Bio Sections' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Bio' },
    { name: 'bio', type: 'richText' },
  ],
}

const AboutTalksSectionBlock: Block = {
  slug: 'aboutTalksSection',
  labels: { singular: 'Talks', plural: 'Talks Sections' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Talks' },
    {
      name: 'talks',
      type: 'array',
      fields: aboutMediaFields,
    },
  ],
}

const AboutInterviewsSectionBlock: Block = {
  slug: 'aboutInterviewsSection',
  labels: { singular: 'Interviews', plural: 'Interviews Sections' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Interviews' },
    {
      name: 'interviews',
      type: 'array',
      fields: aboutMediaFields,
    },
  ],
}

const AboutPatentsSectionBlock: Block = {
  slug: 'aboutPatentsSection',
  labels: { singular: 'Patents', plural: 'Patents Sections' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Patents' },
    {
      name: 'patents',
      type: 'array',
      fields: aboutPatentFields,
    },
  ],
}

const AboutPlaygroundSectionBlock: Block = {
  slug: 'aboutPlaygroundSection',
  labels: { singular: 'Playground', plural: 'Playground Sections' },
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Playground' },
    { name: 'itemLimit', type: 'number', defaultValue: 5 },
    { name: 'linkText', type: 'text', defaultValue: 'View all' },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  defaultSort: 'order',
  admin: {
    components: {
      edit: {
        editMenuItems: ['./components/admin/PagesEditMenuTabs#PagesEditMenuTabs'],
      },
    },
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'type', 'status', 'order'],
    pagination: { defaultLimit: 100 },
    group: 'Collections',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'custom',
      options: [
        { label: 'Home', value: 'home' },
        { label: 'About', value: 'about' },
        { label: 'Clients', value: 'clients' },
        { label: 'People', value: 'people' },
        { label: 'Custom', value: 'custom' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'published',
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Draft', value: 'draft' },
      ],
      admin: { position: 'sidebar' },
    },

    // ── Home: composable sections ──
    {
      name: 'sections',
      type: 'blocks',
      admin: {
        condition: isType('home'),
        initCollapsed: true,
      },
      blocks: [HeroBlock, HScrollBlock, AboutBlock, PillGridBlock, NumberedGridBlock, MarqueeBlock, AccordionBlock, CalloutBlock, SocialLinksBlock],
    },

    // ── About fields ──
    {
      name: 'bio',
      type: 'richText',
      admin: { condition: () => false },
    },
    {
      name: 'aboutSections',
      label: 'Content',
      type: 'blocks',
      admin: {
        condition: isType('about'),
        initCollapsed: true,
        description: 'Each block is a whole section. Drag blocks to control the About page order.',
      },
      blocks: [AboutBioSectionBlock, AboutTalksSectionBlock, AboutInterviewsSectionBlock, AboutPatentsSectionBlock, AboutPlaygroundSectionBlock],
    },
    {
      name: 'bioImage',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: () => false },
    },
    {
      name: 'talks',
      type: 'array',
      admin: { condition: () => false },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'event', type: 'text', required: true },
        { name: 'year', type: 'text' },
        { name: 'duration', type: 'text' },
        { name: 'url', type: 'text' },
        { name: 'thumbnail', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'interviews',
      type: 'array',
      admin: { condition: () => false },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'event', type: 'text', required: true },
        { name: 'year', type: 'text' },
        { name: 'duration', type: 'text' },
        { name: 'url', type: 'text' },
        { name: 'thumbnail', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'patents',
      type: 'array',
      admin: { condition: () => false },
      fields: [
        { name: 'patentId', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text' },
      ],
    },

    // ── Clients fields ──
    {
      name: 'clientsHeading',
      label: 'Heading',
      type: 'text',
      defaultValue: 'Clients',
      admin: { condition: isType('clients') },
    },

    // ── People fields ──
    {
      name: 'peopleHeading',
      label: 'Heading',
      type: 'text',
      defaultValue: 'People',
      admin: { condition: isType('people') },
    },
    {
      name: 'peopleDescription',
      label: 'Description',
      type: 'textarea',
      admin: { condition: isType('people') },
    },

    // ── Custom page fields ──
    {
      name: 'content',
      type: 'blocks',
      admin: { condition: isType('custom') },
      blocks: [SectionHeader, FullWidthImage, FullWidthVideo, DeviceMockup, TextBlock, TwoColumn],
    },

    // ── SEO ──
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        {
          name: 'image',
          label: 'OG Image',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Overrides the default social share image for this page.',
          },
        },
      ],
    },
  ],
}

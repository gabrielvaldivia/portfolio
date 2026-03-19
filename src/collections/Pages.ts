import type { Block, CollectionConfig, Field } from 'payload'
import { SectionHeader } from '../blocks/SectionHeader/config'
import { FullWidthImage } from '../blocks/FullWidthImage/config'
import { FullWidthVideo } from '../blocks/FullWidthVideo/config'
import { ImageGrid } from '../blocks/ImageGrid/config'
import { DeviceMockup } from '../blocks/DeviceMockup/config'
import { TextBlock } from '../blocks/TextBlock/config'
import { TwoColumn } from '../blocks/TwoColumn/config'

const isType = (type: string) => (data: any) => data?.type === type

const columnsField: Field = {
  name: 'columns',
  type: 'select',
  defaultValue: '6',
  options: [
    { label: '1 Column', value: '1' },
    { label: '2 Columns', value: '2' },
    { label: '3 Columns', value: '3' },
    { label: '4 Columns', value: '4' },
    { label: '5 Columns', value: '5' },
    { label: '6 Columns', value: '6' },
  ],
  admin: { position: 'sidebar' },
}

// ── Section Blocks (for Home page) ──

const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    columnsField,
    { name: 'heading', type: 'text', required: true },
    { name: 'fullWidth', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}

const HScrollBlock: Block = {
  slug: 'hScroll',
  labels: { singular: 'Horizontal Scroll', plural: 'Horizontal Scrolls' },
  fields: [
    columnsField,
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
    { name: 'cardWidth', type: 'number', defaultValue: 480 },
    { name: 'gap', type: 'number', defaultValue: 40 },
    { name: 'fullWidth', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}

const AboutBlock: Block = {
  slug: 'aboutSection',
  labels: { singular: 'About', plural: 'About Sections' },
  fields: [
    columnsField,
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'richText' },
  ],
}

const PillGridBlock: Block = {
  slug: 'pillGrid',
  labels: { singular: 'Pill Grid', plural: 'Pill Grids' },
  fields: [
    columnsField,
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
    columnsField,
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
    columnsField,
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
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    columnsField,
    { name: 'title', type: 'text', defaultValue: 'FAQs' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'text', required: true },
      ],
    },
  ],
}

const CalloutBlock: Block = {
  slug: 'callout',
  labels: { singular: 'Callout', plural: 'Callouts' },
  fields: [
    columnsField,
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'richText' },
    { name: 'availability', type: 'text', admin: { description: 'e.g. "Available for new projects"' } },
  ],
}

const SocialLinksBlock: Block = {
  slug: 'socialLinks',
  labels: { singular: 'Social Links', plural: 'Social Links' },
  fields: [
    columnsField,
    { name: 'title', type: 'text', defaultValue: 'Elsewhere' },
    {
      name: 'links',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'type', 'status'],
    pagination: { defaultLimit: 100 },
    group: 'Site',
  },
  access: {
    read: () => true,
  },
  fields: [
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
      admin: { condition: isType('about') },
    },
    {
      name: 'bioImage',
      type: 'upload',
      relationTo: 'media',
      admin: { condition: isType('about') },
    },
    {
      name: 'talks',
      type: 'array',
      admin: { condition: isType('about') },
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
      admin: { condition: isType('about') },
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
      admin: { condition: isType('about') },
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

    // ── Custom page fields ──
    {
      name: 'content',
      type: 'blocks',
      admin: { condition: isType('custom') },
      blocks: [SectionHeader, FullWidthImage, FullWidthVideo, ImageGrid, DeviceMockup, TextBlock, TwoColumn],
    },

    // ── SEO ──
    {
      name: 'meta',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
}

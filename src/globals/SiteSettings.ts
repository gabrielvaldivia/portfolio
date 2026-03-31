import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Settings',
  admin: {
    group: 'Admin',
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: 'siteTitle', type: 'text', defaultValue: 'Gabriel Valdivia', label: 'Site Title' },
    { name: 'siteName', type: 'text', label: 'Site Name', admin: { description: 'Used in og:site_name for social previews' } },
    { name: 'siteDescription', type: 'textarea', label: 'Site Description' },
    { name: 'canonicalUrl', type: 'text', label: 'Canonical URL', admin: { placeholder: 'https://gabrielvaldivia.com' } },
    { name: 'noIndex', type: 'checkbox', label: 'Block Search Engines', defaultValue: false, admin: { description: 'Adds noindex meta tag to prevent search engine indexing' } },
    { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon', admin: { description: '64 × 64 pixels' } },
    { name: 'socialImage', type: 'upload', relationTo: 'media', label: 'Social Preview', admin: { description: '1200 × 630 pixels' } },
    { name: 'appleTouchIcon', type: 'upload', relationTo: 'media', label: 'Apple Touch Icon', admin: { description: '180 × 180 pixels' } },
    { name: 'googleAnalyticsId', type: 'text', label: 'Google Analytics ID', admin: { placeholder: 'G-XXXXXXXXXX' } },
    {
      name: 'overlays',
      type: 'array',
      label: 'Overlay Effects',
      admin: { description: 'Scheduled visual overlays. The first active one wins.' },
      fields: [
        {
          name: 'effect',
          type: 'select',
          required: true,
          options: [
            { label: 'Balloons', value: 'balloons' },
            { label: 'Palm Shadows', value: 'shadows' },
            { label: 'Aurora Borealis', value: 'aurora' },
            { label: 'Night Stars', value: 'stars' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'startDate', type: 'date', label: 'Start Date', required: true, admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'MMM d' } } },
            { name: 'endDate', type: 'date', label: 'End Date', admin: { description: 'Leave empty for single day', date: { pickerAppearance: 'dayOnly', displayFormat: 'MMM d' } } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'colorMode',
              type: 'select',
              label: 'Visible In',
              defaultValue: 'both',
              options: [
                { label: 'Both', value: 'both' },
                { label: 'Light Mode Only', value: 'light' },
                { label: 'Dark Mode Only', value: 'dark' },
              ],
              admin: { width: '50%' },
            },
            {
              name: 'repeat',
              type: 'select',
              label: 'Repeat',
              defaultValue: 'yearly',
              options: [
                { label: 'Every Year', value: 'yearly' },
                { label: 'None', value: 'none' },
              ],
              admin: { width: '50%' },
            },
          ],
        },
        { name: 'pillEnabled', type: 'checkbox', label: 'Show Floating Pill', defaultValue: false },
        { name: 'pillText', type: 'text', label: 'Pill Text', admin: { condition: (_: any, siblingData: any) => siblingData?.pillEnabled, placeholder: "It's my birthday! Help me support immigrant children" } },
        { name: 'pillButtonLabel', type: 'text', label: 'Pill Button Label', admin: { condition: (_: any, siblingData: any) => siblingData?.pillEnabled, placeholder: 'Donate to KIND' } },
        { name: 'pillButtonLink', type: 'text', label: 'Pill Button Link', admin: { condition: (_: any, siblingData: any) => siblingData?.pillEnabled, placeholder: 'https://gofund.me/8ccd17bd' } },
      ],
    },
  ],
}

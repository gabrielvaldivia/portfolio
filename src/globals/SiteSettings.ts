import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Settings',
  admin: {
    group: 'Site',
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
  ],
}

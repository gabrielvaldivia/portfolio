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
    { name: 'title', type: 'text', defaultValue: 'Gabriel Valdivia' },
    { name: 'description', type: 'textarea' },
    { name: 'copyright', type: 'text', defaultValue: '© Gabriel Valdivia' },
    { name: 'clientsHeading', type: 'text', defaultValue: 'Clients', admin: { description: 'Heading for the clients page' } },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
  ],
}

import type { GlobalConfig } from 'payload'

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  admin: {
    group: 'Site',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Nav',
          fields: [
            {
              name: 'items',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
                { name: 'newTab', type: 'checkbox', defaultValue: false },
              ],
            },
          ],
        },
        {
          label: 'Footer',
          fields: [
            { name: 'copyright', type: 'text', defaultValue: '© Gabriel Valdivia' },
          ],
        },
      ],
    },
  ],
}
